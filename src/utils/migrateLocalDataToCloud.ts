import { getDb as getLocalDb } from '@/src/db/local/client';
import * as localRepos from '@/src/db/local/repositories';
import * as cloudRepos from '@/src/db/repositories';

type Log = (line: string) => void;

/**
 * Copia una tantum i dati inseriti in locale (prima del passaggio a Supabase) nel database
 * cloud dell'azienda dell'utente corrente. Va eseguita una sola volta, subito dopo aver creato
 * l'azienda: ricrea ogni riga nel cloud (con un nuovo id generato dal database), tenendo una
 * mappa vecchio-id -> nuovo-id per poter tradurre correttamente i riferimenti tra le tabelle
 * (es. il ruolo di un dipendente, i turni di una pianificazione).
 */
export async function migrateLocalDataToCloud(log: Log): Promise<void> {
  const roleIdMap = new Map<string, string>();
  const templateIdMap = new Map<string, string>();
  const employeeIdMap = new Map<string, string>();

  log('Lettura ruoli locali...');
  const localRoles = await localRepos.roleRepository.listRoles();
  for (const role of localRoles) {
    const created = await cloudRepos.roleRepository.createRole({ name: role.name, color: role.color });
    roleIdMap.set(role.id, created.id);
  }
  log(`Ruoli copiati: ${localRoles.length}`);

  log('Lettura turni tipo locali...');
  const localTemplates = await localRepos.shiftTemplateRepository.listShiftTemplates();
  for (const template of localTemplates) {
    const remappedRequirements = template.requirements
      .map((req) => ({
        roleIds: req.roleIds.map((r) => roleIdMap.get(r)).filter((r): r is string => !!r),
        count: req.count,
      }))
      .filter((req) => req.roleIds.length > 0);

    const created = await cloudRepos.shiftTemplateRepository.createShiftTemplate({
      weekday: template.weekday,
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      requirements: remappedRequirements,
    });
    templateIdMap.set(template.id, created.id);
  }
  log(`Turni tipo copiati: ${localTemplates.length}`);

  log('Lettura dipendenti locali...');
  const localEmployees = await localRepos.employeeRepository.listEmployees({ includeInactive: true });
  for (const employee of localEmployees) {
    const newRoleId = roleIdMap.get(employee.roleId);
    if (!newRoleId) {
      log(`⚠ Dipendente "${employee.name}" saltato: ruolo non trovato tra quelli copiati.`);
      continue;
    }
    const created = await cloudRepos.employeeRepository.createEmployee({
      name: employee.name,
      roleId: newRoleId,
      secondaryRoleId: employee.secondaryRoleId ? roleIdMap.get(employee.secondaryRoleId) : undefined,
      weeklyContractHours: employee.weeklyContractHours,
      maxWeeklyHours: employee.maxWeeklyHours,
      maxWeeklyShifts: employee.maxWeeklyShifts,
      maxWeeklyDays: employee.maxWeeklyDays,
      preferredWeekdays: employee.preferredWeekdays,
      preference: employee.preference,
      pinnedShiftTemplateIds: employee.pinnedShiftTemplateIds
        ?.map((t) => templateIdMap.get(t))
        .filter((t): t is string => !!t),
      maxWeeklyShiftsByPreference: employee.maxWeeklyShiftsByPreference,
      active: employee.active,
    });
    employeeIdMap.set(employee.id, created.id);
  }
  log(`Dipendenti copiati: ${employeeIdMap.size}`);

  log('Copia orari di apertura e impostazioni negozio...');
  const localOpeningHours = await localRepos.shopRepository.listOpeningHours();
  const cloudOpeningHours = await cloudRepos.shopRepository.listOpeningHours();
  for (const local of localOpeningHours) {
    const cloudEntry = cloudOpeningHours.find((c) => c.weekday === local.weekday);
    if (!cloudEntry) continue;
    await cloudRepos.shopRepository.updateOpeningHours({
      ...cloudEntry,
      closed: local.closed,
      openTime: local.openTime,
      closeTime: local.closeTime,
    });
  }
  const localShopSettings = await localRepos.shopRepository.getShopSettings();
  await cloudRepos.shopRepository.updateShopSettings(localShopSettings);
  log('Orari e impostazioni copiati.');

  log('Lettura indisponibilità locali...');
  const localUnavailabilities = await localRepos.unavailabilityRepository.listAllUnavailabilities();
  let unavailabilitiesCopied = 0;
  for (const u of localUnavailabilities) {
    const newEmployeeId = employeeIdMap.get(u.employeeId);
    if (!newEmployeeId) continue;
    await cloudRepos.unavailabilityRepository.createUnavailability({
      employeeId: newEmployeeId,
      weekday: u.weekday,
      startTime: u.startTime,
      endTime: u.endTime,
      note: u.note,
    });
    unavailabilitiesCopied++;
  }
  log(`Indisponibilità copiate: ${unavailabilitiesCopied}`);

  log('Lettura ferie locali...');
  const localTimeOff = await localRepos.timeOffRepository.listAllTimeOff();
  let timeOffCopied = 0;
  for (const t of localTimeOff) {
    const newEmployeeId = employeeIdMap.get(t.employeeId);
    if (!newEmployeeId) continue;
    await cloudRepos.timeOffRepository.addTimeOff(newEmployeeId, t.date, t.note);
    timeOffCopied++;
  }
  log(`Ferie copiate: ${timeOffCopied}`);

  log('Ricerca pianificazioni settimanali locali...');
  const localDb = await getLocalDb();
  const weeks = await localDb.getAllAsync<{ week_start_date: string }>(
    'SELECT DISTINCT week_start_date FROM schedules;'
  );
  let schedulesCopied = 0;
  for (const { week_start_date: weekStartDate } of weeks) {
    const schedule = await localRepos.scheduleRepository.getScheduleForWeek(weekStartDate);
    if (!schedule) continue;
    const assignments = await localRepos.scheduleRepository.listAssignmentsForSchedule(schedule.id);

    const remapped = assignments
      .map((a) => {
        const newTemplateId = templateIdMap.get(a.shiftTemplateId);
        const newEmployeeId = employeeIdMap.get(a.employeeId);
        if (!newTemplateId || !newEmployeeId) return null;
        return {
          shiftTemplateId: newTemplateId,
          date: a.date,
          employeeId: newEmployeeId,
          roleIds: (a.roleIds ?? []).map((r) => roleIdMap.get(r)).filter((r): r is string => !!r),
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);

    await cloudRepos.scheduleRepository.saveGeneratedSchedule(weekStartDate, schedule.status, remapped);
    schedulesCopied++;
  }
  log(`Pianificazioni settimanali copiate: ${schedulesCopied}`);

  log('Migrazione completata.');
}
