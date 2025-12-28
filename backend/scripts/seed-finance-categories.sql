-- Seed Finance Categories and Payment Methods

-- Transaction Categories
INSERT OR IGNORE INTO transaction_categories (id, name, type, icon, color, is_active, created_at, updated_at)
VALUES
-- Income Categories
(1, 'Fatture Clienti', 'INCOME', 'receipt', '#10b981', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Consulenze', 'INCOME', 'briefcase', '#3b82f6', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Royalties', 'INCOME', 'trending-up', '#8b5cf6', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'Altro Reddito', 'INCOME', 'plus-circle', '#6b7280', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Expense Categories
(10, 'Tasse e Imposte', 'EXPENSE', 'landmark', '#ef4444', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(11, 'Stipendi', 'EXPENSE', 'users', '#f59e0b', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(12, 'Affitto', 'EXPENSE', 'home', '#8b5cf6', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(13, 'Utenze', 'EXPENSE', 'zap', '#06b6d4', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(14, 'Attrezzature', 'EXPENSE', 'monitor', '#3b82f6', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(15, 'Software e Abbonamenti', 'EXPENSE', 'package', '#ec4899', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(16, 'Marketing', 'EXPENSE', 'megaphone', '#10b981', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(17, 'Formazione', 'EXPENSE', 'book-open', '#f59e0b', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(18, 'Viaggi e Trasferte', 'EXPENSE', 'plane', '#06b6d4', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(19, 'Spese Professionali', 'EXPENSE', 'briefcase', '#6366f1', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(20, 'Altro Costo', 'EXPENSE', 'minus-circle', '#6b7280', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Payment Methods
INSERT OR IGNORE INTO payment_methods (id, name, is_active, created_at, updated_at)
VALUES
(1, 'Bonifico Bancario', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Contanti', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Carta di Credito', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'PayPal', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'Stripe', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'Assegno', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'RID/SEPA', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
