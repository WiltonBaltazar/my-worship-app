import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import { addHours, format, isSameMonth, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Schedule, ScheduleMember } from '@/hooks/useSchedules';
import type { Ministry } from '@/lib/ministry';

const ORGANIZATION = 'DEPARTAMENTO DE MÚSICA DA ASSEMBLEIA DE DEUS ALFA & OMEGA';
const FOOTER_VERSE = 'NB: 1 Samuel 7:3 - "…preparai o vosso coração ao Senhor, e servi a ele só…".';
const MINISTRY_HEADINGS: Record<Ministry, string> = {
  dms: ORGANIZATION,
  ghj: `GHJ - ${ORGANIZATION}`,
};

/** Services are printed as 2-hour slots; schedules only store a start time. */
const SERVICE_DURATION_HOURS = 2;
/** More columns than this get too narrow on landscape A4, so the month wraps onto another page. */
const MAX_COLUMNS_PER_PAGE = 5;

const ORANGE: [number, number, number] = [255, 102, 0];
const BORDER: [number, number, number] = [240, 80, 30];

const ROW_LABELS = {
  hours: 'Horas (CULTO PRESENCIAL)',
  presentations: 'Apresentações',
  lead: 'Dirigente',
  choir: 'Coristas',
  musicians: 'Músicos',
} as const;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function membersOf(schedule: Schedule, functionType: ScheduleMember['function_type']) {
  return (schedule.members ?? []).filter((member) => member.function_type === functionType);
}

function columnHeader(schedule: Schedule) {
  const date = parseDate(schedule.schedule_date);
  return [
    capitalize(format(date, 'EEEE', { locale: ptBR })),
    format(date, 'dd/MM/yyyy'),
    (schedule.title || 'Culto').toUpperCase(),
  ].join('\n');
}

function hoursCell(schedule: Schedule) {
  const start = parse((schedule.start_time || '11:00:00').slice(0, 5), 'HH:mm', parseDate(schedule.schedule_date));
  return `${format(start, 'HH:mm')} - ${format(addHours(start, SERVICE_DURATION_HOURS), 'HH:mm')}`;
}

function presentationsCell(schedule: Schedule) {
  return (schedule.guests ?? []).map((guest) => guest.name).join('\n');
}

/** "Primeira Voz (Soprano)" → "SOPRANO"; anything else is printed as entered. */
function voiceLabel(detail: string | null) {
  if (!detail) return 'VOZ';
  const inParentheses = detail.match(/\(([^)]+)\)/)?.[1];
  return (inParentheses ?? detail).split('/')[0].trim().toUpperCase();
}

function choirCell(schedule: Schedule) {
  return membersOf(schedule, 'backing_vocal')
    .map((member) => `- ${voiceLabel(member.function_detail)}: ${member.profile?.name ?? '—'}`)
    .join('\n');
}

function musiciansCell(schedule: Schedule) {
  return membersOf(schedule, 'instrumentalist')
    .map((member) => `${member.function_detail || 'Instrumentista'} - ${member.profile?.name ?? '—'}`)
    .join('\n');
}

function leadCell(schedule: Schedule) {
  return membersOf(schedule, 'lead_vocal').map((member) => member.profile?.name).filter(Boolean).join('\n');
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function drawPage(doc: jsPDF, heading: string, monthTitle: string, schedules: Schedule[]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const labelColumnWidth = 40;
  const dataColumnWidth = (pageWidth - margin * 2 - labelColumnWidth) / MAX_COLUMNS_PER_PAGE;
  const tableWidth = labelColumnWidth + dataColumnWidth * schedules.length;
  // Keep column widths constant across pages and centre narrower months.
  const tableLeft = (pageWidth - tableWidth) / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(heading, pageWidth / 2, 18, { align: 'center' });
  doc.text(monthTitle, pageWidth / 2, 27, { align: 'center' });

  const body = [
    [ROW_LABELS.hours, ...schedules.map(hoursCell)],
    [ROW_LABELS.presentations, ...schedules.map(presentationsCell)],
    [ROW_LABELS.lead, ...schedules.map(leadCell)],
    [ROW_LABELS.choir, ...schedules.map(choirCell)],
    [ROW_LABELS.musicians, ...schedules.map(musiciansCell)],
  ];

  const listRows = new Set<string>([ROW_LABELS.choir, ROW_LABELS.musicians]);

  autoTable(doc, {
    startY: 34,
    head: [['Data', ...schedules.map(columnHeader)]],
    body,
    theme: 'grid',
    margin: { left: tableLeft, right: tableLeft },
    tableWidth,
    styles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 9.5,
      textColor: 20,
      halign: 'center',
      valign: 'middle',
      lineColor: BORDER,
      lineWidth: 0.35,
      cellPadding: 2.2,
      overflow: 'linebreak',
    },
    headStyles: { fillColor: ORANGE, textColor: 255, fontSize: 11, minCellHeight: 20 },
    columnStyles: {
      0: { cellWidth: labelColumnWidth },
      ...Object.fromEntries(schedules.map((_, index) => [index + 1, { cellWidth: dataColumnWidth }])),
    },
    didParseCell: (data: CellHookData) => {
      if (data.section !== 'body') return;

      const label = String(data.row.raw instanceof Array ? data.row.raw[0] : '');

      // The hours row is part of the orange header band, as on the paper rota.
      if (label === ROW_LABELS.hours) {
        data.cell.styles.fillColor = ORANGE;
        data.cell.styles.textColor = 255;
      }

      if (data.column.index > 0 && listRows.has(label)) {
        data.cell.styles.halign = 'left';
      }

      if (label === ROW_LABELS.choir || label === ROW_LABELS.musicians) {
        data.cell.styles.minCellHeight = 26;
      }
    },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(FOOTER_VERSE, tableLeft, finalY + 10);
}

/**
 * Monthly rota in the church's paper format: one column per service, one row per team.
 * Each ministry gets its own page(s); drafts and rehearsals are left out.
 */
export function downloadMonthSchedulePdf(month: Date, schedules: Schedule[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const monthName = format(month, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
  const monthTitle = `ESCALA DE ${monthName}`;

  const printable = schedules
    .filter((schedule) =>
      schedule.status !== 'draft'
      && schedule.schedule_type !== 'rehearsal'
      && isSameMonth(parseDate(schedule.schedule_date), month))
    .sort((a, b) =>
      a.schedule_date.localeCompare(b.schedule_date)
      || (a.start_time ?? '').localeCompare(b.start_time ?? ''));

  const pages = (['dms', 'ghj'] as Ministry[]).flatMap((ministry) =>
    chunk(printable.filter((schedule) => schedule.ministry === ministry), MAX_COLUMNS_PER_PAGE)
      .map((pageSchedules) => ({ ministry, pageSchedules })));

  if (pages.length === 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(ORGANIZATION, pageWidth / 2, 18, { align: 'center' });
    doc.text(monthTitle, pageWidth / 2, 27, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhuma escala publicada para este mês.', pageWidth / 2, 45, { align: 'center' });
  }

  pages.forEach(({ ministry, pageSchedules }, index) => {
    if (index > 0) doc.addPage();
    drawPage(doc, MINISTRY_HEADINGS[ministry], monthTitle, pageSchedules);
  });

  doc.save(`ESCALA ${monthName}.pdf`);
}
