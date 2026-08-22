import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/src/components/shared/ScreenContainer';
import { TextField } from '@/src/components/shared/TextField';
import { Button } from '@/src/components/shared/Button';
import { Card } from '@/src/components/shared/Card';
import { colors, ROLE_COLOR_PALETTE } from '@/src/components/shared/colors';
import { useRoles } from '@/src/hooks/useRoles';
import { roleRepository } from '@/src/db/repositories';
import { confirmAction } from '@/src/utils/alert';
import { strings } from '@/src/i18n/strings';

export default function RolesScreen() {
  const { roles, reload } = useRoles();
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(ROLE_COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setEditingRoleId(null);
    setName('');
    setColor(ROLE_COLOR_PALETTE[0]);
  };

  const startEdit = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    setEditingRoleId(roleId);
    setName(role.name);
    setColor(role.color);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingRoleId) {
        await roleRepository.updateRole({ id: editingRoleId, name: name.trim(), color });
      } else {
        await roleRepository.createRole({ name: name.trim(), color });
      }
      resetForm();
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    confirmAction(
      'Eliminare il ruolo?',
      'I dipendenti con questo ruolo resteranno senza ruolo valido.',
      async () => {
        if (editingRoleId === id) resetForm();
        await roleRepository.deleteRole(id);
        await reload();
      },
      strings.common.delete,
      true
    );
  };

  return (
    <ScreenContainer>
      {roles.length === 0 && <Text style={styles.empty}>{strings.roles.empty}</Text>}

      {roles.map((role) => (
        <Card key={role.id}>
          <View style={styles.roleRow}>
            <View style={styles.roleLabelRow}>
              <View style={[styles.colorDot, { backgroundColor: role.color }]} />
              <Text style={styles.roleName}>{role.name}</Text>
            </View>
            <View style={styles.roleActions}>
              <View style={styles.roleActionButton}>
                <Button label="Modifica" variant="secondary" onPress={() => startEdit(role.id)} />
              </View>
              <View style={styles.roleActionButton}>
                <Button label={strings.common.delete} variant="danger" onPress={() => handleDelete(role.id)} />
              </View>
            </View>
          </View>
        </Card>
      ))}

      <Text style={styles.sectionTitle}>{editingRoleId ? 'Modifica ruolo' : strings.roles.newRole}</Text>
      <TextField label={strings.roles.name} value={name} onChangeText={setName} placeholder="Es. Commesso" />

      <Text style={styles.label}>{strings.roles.color}</Text>
      <View style={styles.colorsRow}>
        {ROLE_COLOR_PALETTE.map((paletteColor) => (
          <Pressable
            key={paletteColor}
            onPress={() => setColor(paletteColor)}
            style={[
              styles.colorSwatch,
              { backgroundColor: paletteColor },
              color === paletteColor && styles.colorSwatchSelected,
            ]}
          />
        ))}
      </View>

      <View style={styles.formActionsRow}>
        {editingRoleId && (
          <View style={styles.roleActionButton}>
            <Button label={strings.common.cancel} variant="secondary" onPress={resetForm} />
          </View>
        )}
        <View style={styles.formSubmitButton}>
          <Button
            label={editingRoleId ? strings.common.save : strings.common.add}
            onPress={handleSubmit}
            loading={saving}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 16,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  roleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleActionButton: {
    minWidth: 0,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  roleName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  colorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 10,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formSubmitButton: {
    flex: 2,
  },
});
