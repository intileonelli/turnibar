import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { Button } from '@/src/components/shared/Button';
import { Card } from '@/src/components/shared/Card';
import { TextField } from '@/src/components/shared/TextField';
import { colors } from '@/src/components/shared/colors';
import { useEmployees } from '@/src/hooks/useEmployees';
import { membershipRepository } from '@/src/db/repositories';
import { CompanyInfo, EmployeeProfile } from '@/src/db/repositories/membershipRepository';
import { confirmAction, showAlert } from '@/src/utils/alert';
import { strings } from '@/src/i18n/strings';

export default function CompanyAccessScreen() {
  const { employees, reload: reloadEmployees } = useEmployees();
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  const load = useCallback(async () => {
    const [companyInfo, employeeProfiles] = await Promise.all([
      membershipRepository.getMyCompany(),
      membershipRepository.listEmployeeProfiles(),
    ]);
    setCompany(companyInfo);
    setProfiles(employeeProfiles);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (company) setNameInput(company.name);
  }, [company]);

  const handleSaveName = async () => {
    if (!company || !nameInput.trim()) return;
    setSavingName(true);
    try {
      await membershipRepository.updateCompanyName(company.id, nameInput.trim());
      await load();
    } catch (err) {
      showAlert('Errore', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingName(false);
    }
  };

  const handleRegenerate = () => {
    if (!company) return;
    confirmAction(
      'Rigenerare il codice?',
      'Il vecchio codice smetterà di funzionare: chi non si è ancora registrato dovrà usare quello nuovo.',
      async () => {
        setRegenerating(true);
        try {
          await membershipRepository.regenerateInviteCode(company.id);
          await load();
        } finally {
          setRegenerating(false);
        }
      },
      'Rigenera'
    );
  };

  const handleRelink = (profile: EmployeeProfile, employeeId: string) => {
    confirmAction(
      'Cambiare collegamento?',
      `L'account "${profile.fullName}" verrà collegato a questo dipendente invece che a quello attuale.`,
      async () => {
        try {
          await membershipRepository.reassignEmployeeLink(profile.id, employeeId);
          await Promise.all([load(), reloadEmployees()]);
        } catch (err) {
          showAlert('Errore', err instanceof Error ? err.message : String(err));
        }
      },
      'Conferma'
    );
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Accessi dipendenti</Text>

      <Card>
        <Text style={styles.codeLabel}>Nome azienda</Text>
        <Text style={styles.hint}>Mostrato nella schermata principale dell'app al posto di "Turnibar".</Text>
        <TextField label="Nome" value={nameInput} onChangeText={setNameInput} placeholder="Es. Bar Rossi" />
        <Button label={strings.common.save} variant="secondary" onPress={handleSaveName} loading={savingName} />
      </Card>

      <Text style={styles.subtitle}>
        Condividi questo codice con i tuoi dipendenti: lo useranno per registrarsi nell'app e
        identificarsi scegliendo il proprio nome dall'elenco.
      </Text>

      <Card>
        <Text style={styles.codeLabel}>Codice azienda</Text>
        <Text style={[styles.code, { color: colors.primary }]}>{company?.inviteCode ?? '...'}</Text>
        <Button label="Rigenera codice" variant="secondary" onPress={handleRegenerate} loading={regenerating} />
      </Card>

      <Text style={styles.sectionTitle}>Dipendenti e account collegati</Text>
      {employees.map((employee) => {
        const linkedProfile = profiles.find((p) => p.id === employee.linkedUserId);
        return (
          <Card key={employee.id}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            <Text style={styles.hint}>
              {linkedProfile ? `Collegato all'account "${linkedProfile.fullName}"` : 'Nessun account collegato'}
            </Text>
          </Card>
        );
      })}

      {profiles.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Correggi un collegamento sbagliato</Text>
          <Text style={styles.hint}>
            Se un dipendente si è identificato con il nome sbagliato, scegli qui l'account e il
            dipendente corretto a cui collegarlo.
          </Text>
          {profiles.map((profile) => (
            <View key={profile.id} style={styles.relinkRow}>
              <Text style={styles.relinkName}>{profile.fullName}</Text>
              <View style={styles.relinkOptions}>
                {employees.map((employee) => (
                  <Button
                    key={employee.id}
                    label={employee.name}
                    variant={employee.linkedUserId === profile.id ? 'primary' : 'secondary'}
                    onPress={() => handleRelink(profile, employee.id)}
                  />
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  code: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  relinkRow: {
    marginBottom: 16,
  },
  relinkName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  relinkOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
