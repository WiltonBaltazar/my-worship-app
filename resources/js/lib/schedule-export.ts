import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TechnicalScheduleWeek } from '@/hooks/useTechnicalSchedules';
import type { Schedule, ScheduleMember } from '@/hooks/useSchedules';

type ExportPayload = {
  technicalWeeks: TechnicalScheduleWeek[];
  generalSchedules: Schedule[];
  startDate: string;
  generalWeeks: number;
};

const generalStatusLabel: Record<Schedule['status'], string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  confirmed: 'Confirmado',
};

const generalTypeLabel: Record<Schedule['schedule_type'], string> = {
  worship: 'Culto',
  rehearsal: 'Ensaio',
};

const memberFunctionLabel: Record<ScheduleMember['function_type'], string> = {
  lead_vocal: 'Lider',
  backing_vocal: 'Backing',
  instrumentalist: 'Instrumento',
  sound_tech: 'Som',
};

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatTime(value: string): string {
  return value?.slice(0, 5) || '-';
}

function membersSummary(schedule: Schedule): string {
  const members = schedule.members ?? [];

  if (members.length === 0) {
    return '-';
  }

  return members
    .map((member) => {
      const role = memberFunctionLabel[member.function_type] ?? member.function_type;
      const name = member.profile?.name ?? 'Sem nome';

      if (member.function_detail) {
        return `${role} (${member.function_detail}): ${name}`;
      }

      return `${role}: ${name}`;
    })
    .join('\n');
}

function resolveLeadTechForScheduleDate(scheduleDate: string, technicalWeeks: TechnicalScheduleWeek[]): string {
  const scheduleDateTime = parseDate(scheduleDate).getTime();

  const matchingWeek = technicalWeeks.find((week) => {
    const weekStart = parseDate(week.week_start_date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return scheduleDateTime >= weekStart.getTime() && scheduleDateTime < weekEnd.getTime();
  });

  return matchingWeek?.lead_profile?.name ?? 'Nao definido';
}

export function exportTechnicalAndGeneralSchedulesPdf(payload: ExportPayload): void {
  const { technicalWeeks, generalSchedules, startDate, generalWeeks } = payload;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const printableDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  const generatedAt = new Date().toLocaleString('pt-BR');
  const orangeHeaderFill: [number, number, number] = [234, 88, 12];
  const orangeHeaderText: [number, number, number] = [255, 255, 255];
  const orangeLine: [number, number, number] = [251, 146, 60];
  const orangeAltRow: [number, number, number] = [255, 247, 237];
  const sortedTechnicalWeeks = [...technicalWeeks].sort((left, right) =>
    left.week_start_date.localeCompare(right.week_start_date),
  );

  doc.setFontSize(16);
  doc.text('Relatorio de Escalas', 40, 40);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${generatedAt}`, 40, 58);
  doc.text(`Inicio de referencia: ${formatDate(startDate)}`, 40, 74);

  doc.setFontSize(12);
  doc.text('Escala Tecnica (Som)', 40, 98);

  autoTable(doc, {
    startY: 106,
    theme: 'grid',
    head: [['Semana', 'Técnico Lead', 'Técnico Assistente', 'Técnico de Streaming']],
    body: technicalWeeks.map((week) => [
      formatDate(week.week_start_date),
      week.lead_profile?.name ?? 'Nao definido',
      week.sound_profile?.name ?? 'Nao definido',
      week.streaming_profile?.name ?? 'Nao definido',
    ]),
    styles: { fontSize: 9, cellPadding: 4, valign: 'top', lineColor: orangeLine, lineWidth: 0.2 },
    headStyles: { fillColor: orangeHeaderFill, textColor: orangeHeaderText, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: orangeAltRow },
  });

  const techTableEndY = printableDoc.lastAutoTable?.finalY ?? 106;
  let generalTitleY = techTableEndY + 28;

  if (generalTitleY > 740) {
    doc.addPage();
    generalTitleY = 40;
  }

  doc.setFontSize(12);
  doc.text(`Escala Geral (Tabela - ${generalWeeks} semanas)`, 40, generalTitleY);

  autoTable(doc, {
    startY: generalTitleY + 8,
    theme: 'grid',
    head: [['Data', 'Horario', 'Tipo', 'Status', 'Lead Tech', 'Titulo', 'Equipa']],
    body: generalSchedules.map((schedule) => [
      formatDate(schedule.schedule_date),
      formatTime(schedule.start_time),
      generalTypeLabel[schedule.schedule_type] ?? schedule.schedule_type,
      generalStatusLabel[schedule.status] ?? schedule.status,
      resolveLeadTechForScheduleDate(schedule.schedule_date, sortedTechnicalWeeks),
      schedule.title || '-',
      membersSummary(schedule),
    ]),
    styles: { fontSize: 8.5, cellPadding: 4, valign: 'top', lineColor: orangeLine, lineWidth: 0.2 },
    headStyles: { fillColor: orangeHeaderFill, textColor: orangeHeaderText, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: orangeAltRow },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 42 },
      2: { cellWidth: 42 },
      3: { cellWidth: 50 },
      4: { cellWidth: 68 },
      5: { cellWidth: 88 },
      6: { cellWidth: 'auto' },
    },
  });

  doc.save(`escalas-tecnica-geral-${startDate}.pdf`);
}
