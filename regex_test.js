const body = "𝖠/𝖼 *0117 𝖣𝖾𝖻𝗂𝗍𝖾𝖽 𝖿𝗈𝗋 Rs:30.00 on 18-03-2026 16:02:18 by Mob Bk ref no 120214220659 Avl Bal Rs:53.02.If not you, Call 1800222243 -𝖴𝗇𝗂𝗈𝗇 𝖡𝖺𝗇𝗄 𝗈𝖿 𝖨𝗇𝖽𝗂𝖺";

function normalize(text) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        const codePoint = text.codePointAt(i);
        if (codePoint > 0xFFFF) i++; // handle surrogate pairs
        
        if (codePoint >= 0x1D400 && codePoint <= 0x1D7FF) {
            // Simplified logic for simulation
            const offset = (codePoint - 0x1D400) % 52;
            if (offset < 26) result += String.fromCharCode('A'.charCodeAt(0) + offset);
            else result += String.fromCharCode('a'.charCodeAt(0) + (offset - 26));
        } else {
            result += String.fromCodePoint(codePoint);
        }
    }
    return result;
}

const normalized = normalize(body);
console.log("Normalized:", normalized);

const currencyAmountRegex = /(?:Rs|INR|Amt|Amount|₹)[\s:\.]*([\d,]+\.?\d*)/gi;
let match;
while ((match = currencyAmountRegex.exec(normalized)) !== null) {
    console.log("Currency Match:", match[0], "Amount:", match[1]);
}

const debitRegex = /(debited|spent|paid|withdrawal|dr|depicted|extracted|purchased)/i;
console.log("Is Debit:", debitRegex.test(normalized));

const refNoRegex = /(?:ref|rrn|txn|id)(?:\s+no)?\.?\s*[:\-]?\s*([a-z0-9]{6,})/i;
const refMatch = refNoRegex.exec(normalized);
console.log("RefNo:", refMatch ? refMatch[1] : "None");
