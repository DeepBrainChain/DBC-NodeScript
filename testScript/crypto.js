import crypto from 'crypto'

// 生成符合规范长度的密钥
function genkey(secret, length = 32) {
  return crypto.createHash('sha256').update(String(secret)).digest('base64').substr(0, length);
}

// 解密字符串
export const decryptByAes256 = (content) => {
  const decipher = crypto.createDecipheriv('aes-256-cbc', genkey('CongtuCrypto'), genkey('DBC2017', 16));
  let dec = decipher.update(content, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}