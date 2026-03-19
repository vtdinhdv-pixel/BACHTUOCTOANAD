import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export interface ExportMessage {
  role: 'user' | 'model';
  content: string;
}

export const exportToDocx = async (messages: ExportMessage[]) => {
  if (!messages || messages.length === 0) return;

  const children = [];
  
  children.push(
    new Paragraph({
      text: "Lịch sử trò chuyện - Bạch Tuộc AD",
      heading: HeadingLevel.HEADING_1,
    })
  );
  
  children.push(new Paragraph({ text: "" })); // spacing

  for (const msg of messages) {
    const isUser = msg.role === 'user';
    const roleText = isUser ? "Học sinh:" : "Bạch Tuộc AD:";
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: roleText, bold: true })
        ]
      })
    );

    // Dọn dẹp sơ bộ định dạng markdown để text thuần không bị lỗi quá nặng
    const plainTextChunks = msg.content.split('\n');
    for (const chunk of plainTextChunks) {
      if (chunk.trim() !== '') {
        const cleanedChunk = chunk.replace(/[*_#`~]/g, '');
        children.push(
          new Paragraph({
            children: [
               new TextRun({ text: cleanedChunk })
            ]
          })
        );
      }
    }
    
    children.push(new Paragraph({ text: "" })); // spacing
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Bai_tap_Bach_Tuoc_AD.docx";
  a.click();
  window.URL.revokeObjectURL(url);
};
