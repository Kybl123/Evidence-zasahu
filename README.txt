EVIDENCE ZÁSAHŮ – ONLINE VERZE

Projekt je napojený na Supabase:
https://nlnuirccienwounqbxy.supabase.co

Tato verze:
- má přihlášení e-mailem a heslem,
- ukládá místa a zásahy do online databáze,
- podporuje více zásahů pod jedním špendlíkem,
- zachovává barvy a piktogramy kategorií,
- umožňuje úpravu a mazání,
- má roční přehled,
- má JSON zálohu/import,
- je připravená jako PWA.

DŮLEŽITÉ:
Publishable key v config.js je veřejný klíč určený pro klientskou aplikaci. Nikdy do webu nevkládej secret/service_role key ani databázové heslo.

Před prvním použitím:
1. V Supabase musí být vytvořené tabulky podle našeho SQL skriptu.
2. V Authentication musí být povolený Email provider.
3. Pokud je zapnuté potvrzení e-mailu, po registraci potvrď e-mail.

NASAZENÍ:
Aplikaci je potřeba nahrát na HTTPS hosting, např. GitHub Pages nebo Cloudflare Pages. Potom bude stejná adresa fungovat na PC i telefonu a lze ji přidat na plochu jako aplikaci.
