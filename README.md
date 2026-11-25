# TreiNa

App de treino (Android, iPhone e site) com biblioteca de 963 exercícios em vídeo, área TreiNa Mulher,
perfil, favoritos e — com a conta Google — backup automático na nuvem (Supabase).

- **Site:** https://dltechsup.github.io/TreiNa/ (no iPhone: Safari › Compartilhar › Adicionar à Tela de Início)
- **Publicação:** automática a cada push na `main` (`.github/workflows/publicar-site.yml`)
- **Supabase sempre ativo:** `.github/workflows/manter-supabase-ativo.yml` (a cada 2 dias)
- **Banco da nuvem:** `supabase/treina_supabase.sql`

## Configuração (uma vez)

1. Rodar `supabase/treina_supabase.sql` no SQL Editor do Supabase.
2. Em **Settings › Secrets and variables › Actions › Variables**, criar:
   - `SUPABASE_URL` = `https://xxxx.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_...`
3. Em **Settings › Pages**, Source = **GitHub Actions**.
4. Aba **Actions** › *Publicar site* › **Run workflow**.

## Desenvolvimento

```bash
npm install
npx expo start          # Expo Go no celular (usa o .env)
npx expo export -p web  # site em dist/
```

Os vídeos e miniaturas foram convertidos dos GIFs de gifdotreino.com.
