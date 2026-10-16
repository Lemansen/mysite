export const ROLE_LABEL: Record<string, string> = { user: 'Игрок', helper: 'Хелпер', moderator: 'Модератор', admin: 'Владелец' };
export const ROLE_BADGE: Record<string, string> = { helper: 'b-helper', moderator: 'b-role', admin: 'b-owner' };

// Уровни игроков зависят от числа принятых правок
export const LEVELS = [
  { min: 25, name: 'Эксперт' },
  { min: 10, name: 'Знаток' },
  { min: 3, name: 'Участник' },
  { min: 0, name: 'Новичок' },
];
export const levelOf = (n: number) => LEVELS.find(l => n >= l.min)!;
export const nextLevel = (n: number) => [...LEVELS].reverse().find(l => l.min > n);
export const roleName = (role: string, count = 0) => role === 'user' ? levelOf(count).name : (ROLE_LABEL[role] ?? role);
