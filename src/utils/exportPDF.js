import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const exportTimetablePDF = (entries, timeSlots, title = 'Babcock University Timetable') => {
  const doc = new jsPDF('landscape')
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  doc.setFillColor(10, 22, 40)
  doc.rect(0, 0, 297, 40, 'F')
  doc.setTextColor(201, 168, 76)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('BABCOCK UNIVERSITY', 148.5, 16, { align: 'center' })
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text(title, 148.5, 26, { align: 'center' })
  doc.setFontSize(9)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 148.5, 34, { align: 'center' })

  let yPos = 48

  days.forEach(day => {
    const dayEntries = entries
      .filter(e => e.time_slot?.day === day)
      .sort((a, b) => a.time_slot?.start_time?.localeCompare(b.time_slot?.start_time))

    if (dayEntries.length === 0) return

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(201, 168, 76)
    doc.text(day.toUpperCase(), 14, yPos)
    yPos += 4

    autoTable(doc, {
      startY: yPos,
      head: [['Time', 'Course Code', 'Course Name', 'Lecturer', 'Room', 'Enrollment', 'Status']],
      body: dayEntries.map(e => [
        `${e.time_slot?.start_time?.slice(0, 5)} - ${e.time_slot?.end_time?.slice(0, 5)}`,
        e.course?.code || '-',
        e.course?.name || '-',
        e.lecturer?.name || '-',
        `${e.room?.name}, ${e.room?.building}` || '-',
        `${e.course?.enrollment_count} students`,
        e.status || 'Scheduled'
      ]),
      styles: { fontSize: 8, cellPadding: 3, textColor: [30, 30, 30] },
      headStyles: { fillColor: [10, 22, 40], textColor: [201, 168, 76], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    })

    yPos = doc.lastAutoTable.finalY + 10
    if (yPos > 170) { doc.addPage(); yPos = 20 }
  })

  doc.save('babcock-timetable.pdf')
}