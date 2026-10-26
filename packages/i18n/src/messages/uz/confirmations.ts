export const confirmations = {
  cancelRegistration: {
    title: "Ro'yxatdan o'tishni bekor qilasizmi?",
    description:
      "Siz ishtirokchilar ro'yxatidan o'chirilasiz. Joylar qolsa keyin yana ro'yxatdan o'tishingiz mumkin.",
    confirm: "Ha, bekor qilaman",
    keep: "Ro'yxatda qolaman",
  },
  deleteComment: {
    title: "Izohni o'chirasizmi?",
    description: "Bu amalni qaytarib bo'lmaydi.",
    confirm: "O'chirish",
    keep: "Qoldirish",
  },
  unsaveEvent: {
    title: "Saqlanganlardan olib tashlaysizmi?",
    description: "Tadbir saqlangan ro'yxatdan yo'q bo'ladi.",
    confirm: "Olib tashlash",
    keep: "Qoldirish",
  },
  unsubscribe: {
    title: "Tashkilotchidan obunani bekor qilasizmi?",
    description: "Yangi tadbirlar haqidagi xabarlarni endi olmaysiz.",
    confirm: "Obunani bekor qilish",
    keep: "Obunada qolish",
  },
} as const;
