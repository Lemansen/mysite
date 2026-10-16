export type Item = { id: string; t: string; b: string };
export type Folder = { id: string; name: string; icon: string; note: string; items: Item[] };
export type Promo = { id: string; code: string; reward: string; added: string; until: string };
export type Data = { rules: Folder[]; commands: Folder[]; promos: Promo[] };

export const KEY = 'br_site_v2';
export const uid = () => Math.random().toString(36).slice(2, 9);
export const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
export const fmt = (s: string) => s.split('-').reverse().join('.');
export const pl = (n: number, a: string, b: string, c: string) => {
  n = Math.abs(n) % 100; const m = n % 10;
  return n > 10 && n < 20 ? c : m > 1 && m < 5 ? b : m === 1 ? a : c;
};
export const endOf = (p: Promo) => new Date(p.until + 'T23:59:59').getTime();
export const isExpired = (p: Promo, now: number) => !!p.until && endOf(p) < now;
export const daysLeft = (p: Promo, now: number) => Math.ceil((endOf(p) - now) / 864e5);

const mk = (name: string, icon: string, note: string, items: [string, string][]): Folder => ({
  id: uid(), name, icon, note, items: items.map(([t, b]) => ({ id: uid(), t, b })),
});

export function seed(): Data {
  return {
    rules: [
      mk('Общие правила', '📜', 'Базовые правила ролевой игры. Поправьте под свой сервер.', [
        ['Role Play (RP)', 'Играйте так, как действовал бы ваш персонаж в реальной жизни. Поведение, не подходящее под реальную жизнь, считается NonRP.'],
        ['DM (Death Match)', 'Убийство или нанесение урона игроку без RP-причины.'],
        ['TK (Team Kill)', 'Убийство члена своей фракции или организации без причины.'],
        ['SK (Spawn Kill)', 'Убийство игрока на месте появления (спавн, больница).'],
        ['PG (Power Gaming)', 'Выполнение нереальных для жизни действий.'],
        ['MG (Meta Gaming)', 'Использование информации из OOC-чата или сторонних источников в игровом процессе.'],
        ['RK (Revenge Kill)', 'Месть игроку, убившему вас, после возрождения.'],
        ['Читы и сторонний софт', 'Запрещены любые читы, сторонние программы и использование багов.'],
      ]),
      mk('Транспорт', '🚗', '', [
        ['Правила езды', 'Соблюдайте ПДД в рамках RP.'],
        ['DB (Drive By)', 'Убийство игроков из транспорта или с помощью транспорта без RP-причины.'],
      ]),
      mk('Фракции', '🏛', '', [
        ['Государственные структуры', 'Сотрудники следуют уставу своей структуры и не злоупотребляют должностью.'],
        ['Криминальные организации', 'Захваты и похищения проводятся только по правилам, утверждённым администрацией.'],
      ]),
      mk('Наказания', '⚖️', 'Примерная таблица. Замените на свою.', [
        ['DM / TK / SK', 'Jail 30–60 минут, при повторе бан 1–3 дня.'],
        ['MG / PG / NonRP', 'Предупреждение или jail 15–30 минут.'],
        ['Оскорбления', 'Mute 30–120 минут.'],
        ['Читы', 'Перманентный бан.'],
      ]),
    ],
    commands: [
      mk('Чат и отыгровки', '💬', 'Команды для общения и отыгровки.', [
        ['/me [действие]', 'Отыгровка действия. Пример: /me достал паспорт.'],
        ['/do [описание]', 'Описание обстановки. Пример: /do Паспорт в руке.'],
        ['/try [действие]', 'Попытка действия со случайным результатом.'],
        ['/todo [фраза]*[действие]', 'Фраза с действием. Пример: /todo Держите*протянув документы.'],
        ['/b [текст]', 'Локальный OOC-чат.'], ['/s [текст]', 'Крик.'], ['/w [текст]', 'Шёпот.'],
        ['/pm [id] [текст]', 'Личное сообщение игроку.'],
      ]),
      mk('Персонаж', '🧍', '', [
        ['/stats', 'Статистика персонажа.'], ['/time', 'Игровое время.'], ['/gps', 'Меню GPS.'],
        ['/pay [id] [сумма]', 'Передать деньги игроку рядом.'], ['/report [текст]', 'Обращение к администрации.'],
        ['/anim', 'Меню анимаций.'], ['/phone', 'Открыть телефон.'],
      ]),
      mk('Транспорт', '🚗', '', [
        ['/engine', 'Завести или заглушить двигатель.'], ['/lock', 'Закрыть или открыть транспорт.'], ['/key', 'Меню ключей.'],
      ]),
      mk('Фракции', '🏛', '', [['/r [текст]', 'Рация фракции.'], ['/f [текст]', 'Чат организации.']]),
    ],
    promos: [
      { id: uid(), code: 'EXAMPLE-NEW', reward: 'Пример актуального промокода. Замените на свой.', added: iso(new Date()), until: addDays(7) },
      { id: uid(), code: 'EXAMPLE-SOON', reward: 'Пример промокода, который скоро закончится.', added: addDays(-6), until: addDays(1) },
      { id: uid(), code: 'EXAMPLE-OLD', reward: 'Пример закончившегося промокода.', added: addDays(-30), until: addDays(-10) },
    ],
  };
}
