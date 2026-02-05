import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Inicializa o Firebase Admin apenas se ainda não estiver ativo
if (!admin.apps.length) {
  // Tratamento de segurança para a chave privada (corrige as quebras de linha \n)
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

export async function POST(request) {
  try {
    const { tokens, title, body } = await request.json();

    // Validação básica
    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'Nenhum token fornecido.' }, { status: 400 });
    }

    // Estrutura da mensagem
    const message = {
      notification: {
        title: title,
        body: body,
      },
      tokens: tokens,
    };

    // Envio em massa
    const response = await admin.messaging().sendEachForMulticast(message);

    return NextResponse.json({ 
      success: true, 
      enviados: response.successCount, 
      falhas: response.failureCount 
    });

  } catch (error) {
    console.error('Erro no envio:', error);
    return NextResponse.json({ error: 'Erro interno no servidor ao enviar notificação.' }, { status: 500 });
  }
}