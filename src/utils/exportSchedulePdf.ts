import { Platform } from 'react-native';
import { Employee, ShiftAssignment, ShiftTemplate, WEEKDAYS, WEEKDAY_LABELS } from '@/src/models';
import { dateForWeekday, timeToMinutes } from '@/src/engine';
import { formatDateLong } from '@/src/utils/date';
import { getContrastTextColor } from '@/src/utils/color';
import { showAlert } from '@/src/utils/alert';

interface ExportScheduleParams {
  companyName: string;
  weekStartDate: string;
  shiftTemplates: ShiftTemplate[];
  assignments: ShiftAssignment[];
  employees: Employee[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Genera una pagina HTML autonoma con i turni della settimana (una colonna per giorno) e apre
 * la finestra di stampa del browser, da cui si può salvare come PDF: nessuna libreria in più,
 * funziona in ogni browser. Costruita da zero (non è uno screenshot della schermata) perché il
 * calendario in app scorre orizzontalmente e usa componenti nativi non adatti alla stampa.
 */
export function exportWeekAsPdf({
  companyName,
  weekStartDate,
  shiftTemplates,
  assignments,
  employees,
}: ExportScheduleParams): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    showAlert('Non disponibile', 'Il download PDF è disponibile solo dalla versione web dell\'app.');
    return;
  }

  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const dayColumns = WEEKDAYS.map((weekday) => {
    const date = dateForWeekday(weekStartDate, weekday);
    const templatesForDay = shiftTemplates
      .filter((t) => t.weekday === weekday)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const shiftsHtml = templatesForDay
      .map((template) => {
        const cellAssignments = assignments.filter((a) => a.shiftTemplateId === template.id && a.date === date);

        const requirementsHtml = template.requirements
          .map((req) => {
            const reqKey = req.roleIds.join(',');
            const roleAssignments = cellAssignments.filter((a) => {
              if (a.roleIds) return a.roleIds.join(',') === reqKey;
              const emp = employeeById.get(a.employeeId);
              if (!emp) return false;
              return (
                req.roleIds.includes(emp.roleId) ||
                (emp.secondaryRoleId ? req.roleIds.includes(emp.secondaryRoleId) : false)
              );
            });
            const missing = req.count - roleAssignments.length;

            const namesHtml = roleAssignments
              .map((a) => {
                const employee = employeeById.get(a.employeeId);
                const color = employee?.color ?? '#94A3B8';
                const textColor = getContrastTextColor(color);
                return `<span class="chip" style="background:${color};color:${textColor}">${escapeHtml(
                  employee?.name ?? '—'
                )}</span>`;
              })
              .join('');
            const missingHtml = Array.from({ length: Math.max(0, missing) })
              .map(() => `<span class="chip chip-empty">scoperto</span>`)
              .join('');

            return `<div class="chips">${namesHtml}${missingHtml}</div>`;
          })
          .join('');

        return `
          <div class="shift">
            <div class="shift-time">${escapeHtml(template.startTime)} - ${escapeHtml(template.endTime)}</div>
            <div class="shift-name">${escapeHtml(template.name)}</div>
            ${requirementsHtml}
          </div>`;
      })
      .join('');

    return `
      <div class="day">
        <div class="day-header">
          <div class="day-name">${WEEKDAY_LABELS[weekday]}</div>
          <div class="day-date">${escapeHtml(formatDateLong(date))}</div>
        </div>
        ${shiftsHtml || '<div class="empty">Nessun turno</div>'}
      </div>`;
  }).join('');

  const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>Turni ${escapeHtml(formatDateLong(weekStartDate))}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #0F172A; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { font-size: 12px; color: #64748B; margin: 0 0 16px; }
  .week { display: flex; gap: 8px; align-items: flex-start; }
  .day { flex: 1; min-width: 0; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px; }
  .day-header { text-align: center; margin-bottom: 8px; }
  .day-name { font-size: 12px; font-weight: 700; }
  .day-date { font-size: 10px; color: #64748B; }
  .shift { border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px; margin-bottom: 6px; }
  .shift-name { font-size: 9px; color: #64748B; text-align: center; }
  .shift-time { font-size: 12px; font-weight: 700; text-align: center; margin-bottom: 4px; }
  .chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 3px; margin-top: 2px; }
  .chip { border-radius: 5px; padding: 2px 6px; font-size: 10px; font-weight: 700; }
  .chip-empty { border: 1px dashed #94A3B8; color: #64748B; background: transparent; }
  .empty { font-size: 10px; color: #94A3B8; text-align: center; margin-top: 8px; }
  @media print {
    .print-hint { display: none; }
  }
  .print-hint { text-align: center; font-size: 12px; color: #64748B; margin-top: 16px; }
</style>
</head>
<body>
  <h1>${escapeHtml(companyName)}</h1>
  <p class="subtitle">Turni della settimana del ${escapeHtml(formatDateLong(weekStartDate))}</p>
  <div class="week">${dayColumns}</div>
  <p class="print-hint">Scegli "Salva come PDF" nella finestra di stampa per scaricare il file.</p>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showAlert('Popup bloccato', 'Consenti i popup per questo sito per scaricare il PDF dei turni.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  // document.write è asincrono per il rendering: un breve ritardo evita di aprire la finestra
  // di stampa prima che il contenuto sia effettivamente disegnato.
  setTimeout(() => printWindow.print(), 300);
}
