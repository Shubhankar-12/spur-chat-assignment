import db from './client';

const FAQ_SEED: { topic: string; content: string }[] = [
  {
    topic: 'shipping',
    content:
      'We ship to the US, Canada, the UK, and India. Standard delivery is 5–7 business days. Express (2–3 days) is available for an extra fee. Free shipping on orders over $50.',
  },
  {
    topic: 'shipping_india',
    content:
      'For orders within India, standard delivery takes 4–7 business days and express delivery takes 1–3 business days. Free shipping on orders over ₹999, otherwise a flat ₹49 shipping fee applies. Cash on Delivery (COD) is available, and you can also pay via UPI, major cards, and net banking. We deliver to all major cities and most PIN codes.',
  },
  {
    topic: 'returns',
    content:
      'We accept returns within 30 days of delivery. Items must be unused and in original packaging. To start a return, email support@fakestore.example. Refunds are processed within 5–7 business days.',
  },
  {
    topic: 'support_hours',
    content:
      "Our support team is available Monday–Friday, 9am–6pm EST. For urgent issues outside these hours, leave a message and we'll respond the next business day.",
  },
  {
    topic: 'payments',
    content:
      'We accept Visa, Mastercard, Amex, and PayPal. All transactions are secured with 256-bit SSL encryption.',
  },
  {
    topic: 'order_tracking',
    content:
      "Once your order ships, you'll receive a tracking link by email. You can also check your order status on our website under 'My Orders'.",
  },
];

export function seed(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id),
      sender TEXT NOT NULL CHECK(sender IN ('user', 'ai')),
      text TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      content TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation
      ON messages (conversation_id, timestamp);
  `);

  const { count } = db.prepare('SELECT COUNT(*) AS count FROM faq').get() as {
    count: number;
  };

  if (count === 0) {
    const insert = db.prepare('INSERT INTO faq (topic, content) VALUES (?, ?)');
    const insertMany = db.transaction((rows: typeof FAQ_SEED) => {
      for (const row of rows) insert.run(row.topic, row.content);
    });
    insertMany(FAQ_SEED);
    console.log(`[seed] Inserted ${FAQ_SEED.length} FAQ entries.`);
  }
}
