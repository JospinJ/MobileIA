# Mobile AI — chatbot de démo

Interface Next.js minimale. La clé API reste sur le serveur, jamais dans le navigateur.

## Lancer en local

```bash
cd mobileai-chatbot
npm install
npm run dev
```

Ouvre http://localhost:3000

## Variables d’environnement (Vercel)

```text
MOBILEAI_API_KEY=pk_live_...
DJANGO_CHAT_STREAM_URL=https://rag-platform-backend-qt2l.onrender.com/api/v1/chat/stream/
```

Ne commite jamais `.env.local`.

