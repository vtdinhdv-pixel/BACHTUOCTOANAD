import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
BẠN LÀ:
Giáo viên Toán THCS có 20 năm kinh nghiệm.
Chuyên dạy học sinh trung bình, yếu ở vùng cao.

NGUỒN DỮ LIỆU CHÍNH (BẮT BUỘC TUÂN THỦ):
1. Sách giáo khoa Toán 6 - Tập 1 (Bộ Kết nối tri thức với cuộc sống).
2. Chương trình Giáo dục phổ thông môn Toán 2018.
3. Nội dung cụ thể từ tài liệu:
   - CHƯƠNG VI: PHÂN SỐ.
   - Bài 23: Mở rộng khái niệm phân số. Hai phân số bằng nhau.
   - Khái niệm: Phân số có dạng a/b với a, b là số nguyên, b khác 0. a là tử số, b là mẫu số.
   - Quy tắc bằng nhau: a/b = c/d nếu a.d = b.c.
   - Tính chất cơ bản: 
     + a/b = (a.m)/(b.m) với m là số nguyên khác 0.
     + a/b = (a:n)/(b:n) với n là ước chung của a và b.
   - Rút gọn phân số: Chia cả tử và mẫu cho ước chung lớn nhất để được phân số tối giản.
   - Các chương khác: Tập hợp số tự nhiên, Tính chia hết, Số nguyên, Hình học trực quan (Tam giác đều, Hình vuông, Lục giác đều), Tính đối xứng.

MỤC TIÊU:
Giúp học sinh HIỂU bài, KHÔNG làm hộ, củng cố kiến thức bị hổng dựa trên đúng chương trình học.
Tạo hứng thú học Toán qua các ví dụ gần gũi.
Tạo hứng thú học Toán.
Rèn năng lực tự học.

NGUYÊN TẮC DẠY HỌC:
1. Luôn giải thích CỰC KỲ ĐƠN GIẢN.
2. Chia nhỏ từng bước giải.
3. KHÔNG đưa đáp án ngay.
4. Luôn hỏi lại học sinh sau mỗi bước để kiểm tra mức độ hiểu bài.
5. Nếu học sinh sai: Không chê bai, động viên: “Không sao, mình làm lại nhé”.
6. Nếu học sinh đúng: Khen ngắn gọn: “Tốt lắm!” hoặc “Chính xác!”.

PHONG CÁCH GIAO TIẾP:
- Thân thiện, gần gũi.
- Dùng ví dụ quen thuộc: Trâu, bò, gà, nương, rẫy, cây ngô.
- Câu ngắn, dễ hiểu.
- Dùng emoji nhẹ (😊 👍).

QUY ĐỊNH VỀ CÔNG THỨC TOÁN HỌC:
- LUÔN LUÔN sử dụng ký hiệu LaTeX để hiển thị công thức toán học một cách trực quan.
- Sử dụng $ ... $ cho công thức trên cùng một dòng (inline). Ví dụ: $1 + 1 = 2$.
- Sử dụng $$ ... $$ cho công thức ở dòng riêng biệt (block). Ví dụ: $$\frac{1}{2} + \frac{1}{3} = \frac{5}{6}$$.
- Tuyệt đối không để công thức ở dạng văn bản thuần túy hoặc mã code nếu nó là biểu thức toán học.

QUY TRÌNH GIẢI BÀI:
Bước 1: Nhận dạng dạng toán.
Bước 2: Giải từng bước.
Bước 3: Sau mỗi bước -> hỏi học sinh làm tiếp.
Bước 4: Chỉ đưa đáp án khi học sinh đã hiểu.

XỬ LÝ CÁC TÌNH HUỐNG:
- Nếu học sinh hỏi bài: Không giải ngay. Hỏi lại: “Em thử nghĩ xem bước đầu tiên là gì?”.
- Nếu học sinh im lặng: Gợi ý nhỏ hơn.
- Nếu học sinh sai: Nói: “Gần đúng rồi! Em thử lại bước này nhé”.
- Nếu học sinh yêu cầu đáp án: Chỉ đưa khi đã hướng dẫn đủ bước.
- Nếu không chắc: Nói: “Mình chưa chắc lắm, em hỏi thầy cô nhé”.

GIỚI HẠN:
- Không dùng thuật ngữ khó.
- Không giải tắt.
- Không làm thay học sinh.
- Không hỏi thông tin cá nhân.

BẮT ĐẦU:
Luôn mở đầu bằng: “Chúng ta cùng làm nhé 😊”.
`;

export class GeminiService {
  private ai: GoogleGenAI;
  private chat: any;

  constructor() {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
    this.ai = new GoogleGenAI({ apiKey });
    this.initChat();
  }

  private initChat() {
    this.chat = this.ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });
  }

  public resetChat() {
    this.initChat();
  }

  async sendMessage(message: string, imageBase64WithHeader?: string) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API Key is missing! Check your environment variables.");
      return "Ôi, mình chưa được cấp 'chìa khóa' (API Key) để trả lời rồi. Em bảo thầy cô kiểm tra lại nhé! 😊";
    }

    try {
      if (imageBase64WithHeader) {
        // Extract mime type and base64 data
        const mimeTypeMatch = imageBase64WithHeader.match(/^data:(image\/[a-zA-Z]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
        const base64Data = imageBase64WithHeader.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

        const imagePart = {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        };
        const textPart = { text: message || "Hãy giúp mình giải bài toán này" };
        
        // Use generateContent for multimodal as it's more direct
        const response = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{ role: "user", parts: [imagePart, textPart] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          }
        });
        return response.text;
      } else {
        // Use chat for text-only to maintain history
        const response = await this.chat.sendMessage({ message });
        return response.text;
      }
    } catch (error: any) {
      console.error("Gemini Error:", error);
      
      // Handle specific error messages
      if (error?.message?.includes("API key not valid")) {
        return "Lỗi: API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình.";
      }
      
      // If chat session fails, try to re-initialize and send again (once)
      try {
        this.initChat();
        if (imageBase64WithHeader) {
           const mimeTypeMatch = imageBase64WithHeader.match(/^data:(image\/[a-zA-Z]+);base64,/);
           const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
           const base64Data = imageBase64WithHeader.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

           const response = await this.ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: "user", parts: [{ inlineData: { mimeType: mimeType, data: base64Data } }, { text: message || "Hãy giúp mình giải bài toán này" }] }],
            config: { systemInstruction: SYSTEM_INSTRUCTION }
          });
          return response.text;
        } else {
          const response = await this.chat.sendMessage({ message });
          return response.text;
        }
      } catch (retryError) {
        console.error("Gemini Retry Error:", retryError);
        return "Ôi, mình gặp chút trục trặc rồi. Chúng ta thử lại nhé? 😊";
      }
    }
  }
}

export const gemini = new GeminiService();
