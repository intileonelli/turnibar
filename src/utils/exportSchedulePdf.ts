import { Platform } from 'react-native';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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

/** Contenuto (stile incluso) della pagina turni, riusato sia per l'anteprima sia per il PDF. */
function buildScheduleHtml({ companyName, weekStartDate, shiftTemplates, assignments, employees }: ExportScheduleParams): string {
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

  return `
    <style>
      .turnibar-export * { box-sizing: border-box; }
      .turnibar-export { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0F172A; background: #FFFFFF; padding: 20px; width: 1400px; }
      .turnibar-export h1 { font-size: 22px; margin: 0 0 4px; }
      .turnibar-export .subtitle { font-size: 14px; color: #64748B; margin: 0 0 18px; }
      .turnibar-export .week { display: flex; gap: 10px; align-items: flex-start; }
      .turnibar-export .day { flex: 1; min-width: 0; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px; }
      .turnibar-export .day-header { text-align: center; margin-bottom: 8px; }
      .turnibar-export .day-name { font-size: 16px; font-weight: 700; }
      .turnibar-export .day-date { font-size: 13px; color: #64748B; }
      .turnibar-export .shift { border: 1px solid #E2E8F0; border-radius: 6px; padding: 7px; margin-bottom: 7px; }
      .turnibar-export .shift-name { font-size: 12px; color: #64748B; text-align: center; }
      .turnibar-export .shift-time { font-size: 17px; font-weight: 700; text-align: center; margin-bottom: 5px; }
      .turnibar-export .chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; margin-top: 3px; }
      .turnibar-export .chip { border-radius: 5px; padding: 4px 8px; font-size: 15px; font-weight: 700; }
      .turnibar-export .chip-empty { border: 1px dashed #94A3B8; color: #64748B; background: transparent; }
      .turnibar-export .empty { font-size: 13px; color: #94A3B8; text-align: center; margin-top: 8px; }
    </style>
    <div class="turnibar-export">
      <h1>${escapeHtml(companyName)}</h1>
      <p class="subtitle">Turni della settimana del ${escapeHtml(formatDateLong(weekStartDate))}</p>
      <div class="week">${dayColumns}</div>
    </div>`;
}

/**
 * Genera un vero file PDF (colori dei dipendenti inclusi) e lo scarica direttamente, senza
 * passare dalla finestra di stampa del browser: utile perché la stampa di sfondo/colori è
 * disattivata di default nella maggior parte dei browser (l'utente dovrebbe attivarla a mano
 * ogni volta), e su telefono il flusso "stampa in PDF" è scomodo. Si disegna la pagina fuori
 * schermo, la si trasforma in immagine (html2canvas) e la si incolla in un PDF (jsPDF).
 */
export async function exportWeekAsPdf(params: ExportScheduleParams): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    showAlert('Non disponibile', 'Il download PDF è disponibile solo dalla versione web dell\'app.');
    return;
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-10000px';
  container.style.zIndex = '-1';
  container.innerHTML = buildScheduleHtml(params);
  document.body.appendChild(container);

  try {
    // Un frame di respiro perché il layout appena inserito sia effettivamente disegnato prima
    // dello screenshot.
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#FFFFFF' });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const imgRatio = canvas.width / canvas.height;
    let renderWidth = maxWidth;
    let renderHeight = renderWidth / imgRatio;
    if (renderHeight > maxHeight) {
      renderHeight = maxHeight;
      renderWidth = renderHeight * imgRatio;
    }
    const x = (pageWidth - renderWidth) / 2;
    const y = margin;
    pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
    pdf.save(`turni-${params.weekStartDate}.pdf`);
  } catch (err) {
    showAlert('Errore', err instanceof Error ? err.message : String(err));
  } finally {
    document.body.removeChild(container);
  }
}
