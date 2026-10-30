'use strict';
/**
 * Backfill: adiciona `members` às medições existentes que não têm o campo.
 *
 * Lê bins/BIN-0001.members (atual) e aplica o mesmo array a cada medição
 * onde binId == 'BIN-0001' e que ainda não tem members (ou tem incompleto).
 *
 * Uso:
 *   1. Gerar chave de service account no Console Firebase:
 *      Configurações do projeto → Contas de serviço → Gerar nova chave privada
 *   2. Salvar o JSON em local SEGURO fora do repo (ex.: C:\Users\joaoi\.secrets\lixeira-sa.json)
 *   3. Rodar:
 *        set BACKFILL_SA_KEY=C:\Users\joaoi\.secrets\lixeira-sa.json
 *        set BACKFILL_PROJECT=lixeira-inteligente-65d6d
 *        node tools/backfill-members.js --dry-run    # ver o que faria
 *        node tools/backfill-members.js              # executar de verdade
 *
 * Flags:
 *   --dry-run    Mostra o que faria sem escrever
 *   --bin BIN-0001   (padrão) ID da lixeira
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { readFileSync } = require('node:fs');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const binArg = args.find((a) => a.startsWith('--bin'));
const BIN_ID = binArg ? binArg.split('=')[1] : 'BIN-0001';

const keyPath = process.env.BACKFILL_SA_KEY;
const projectId = process.env.BACKFILL_PROJECT || 'lixeira-inteligente-65d6d';

if (!keyPath) {
  console.error('Erro: defina BACKFILL_SA_KEY com o caminho da chave de service account.');
  console.error('Exemplo: set BACKFILL_SA_KEY=C:\\Users\\joaoi\\.secrets\\lixeira-sa.json');
  process.exit(1);
}

console.log(`Project:  ${projectId}`);
console.log(`Bin:      ${BIN_ID}`);
console.log(`Key:      ${keyPath}`);
console.log(`Mode:     ${dryRun ? 'DRY-RUN (não escreve)' : 'EXECUTAR (escreve)'}`);
console.log('---');

// Inicializar Admin SDK
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({
  credential: cert(serviceAccount),
  projectId,
});

const db = getFirestore();

async function run() {
  // 1. Ler members atuais da lixeira
  const binSnap = await db.doc(`bins/${BIN_ID}`).get();
  if (!binSnap.exists) {
    console.error(`Lixeira ${BIN_ID} não encontrada.`);
    process.exit(1);
  }
  const binData = binSnap.data();
  const members = binData.members || [];
  console.log(`Members atuais de bins/${BIN_ID}:`, members);

  if (members.length === 0) {
    console.error('A lixeira não tem membros. Reivindique-a no app primeiro.');
    process.exit(1);
  }

  // 2. Buscar todas as medições do binId
  const measurementsSnap = await db.collection('measurements')
    .where('binId', '==', BIN_ID)
    .get();

  console.log(`Medições encontradas: ${measurementsSnap.size}`);

  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of measurementsSnap.docs) {
    const data = doc.data();
    const currentMembers = data.members || [];
    // Verificar se já tem todos os members
    const hasAll = members.every((m) => currentMembers.includes(m));
    if (hasAll && currentMembers.length > 0) {
      skipped++;
      continue;
    }
    // Adicionar members que faltam (arrayUnion)
    if (!dryRun) {
      batch.update(doc.ref, { members: FieldValue.arrayUnion(...members) });
      batchCount++;
      if (batchCount === 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
    updated++;
  }

  // Commit do lote final
  if (!dryRun && batchCount > 0) {
    await batch.commit();
  }

  console.log('---');
  console.log(`Atualizadas: ${updated}`);
  console.log(`Ignoradas (já tinham members): ${skipped}`);
  if (dryRun) {
    console.log('(dry-run — nada foi escrito)');
  } else {
    console.log('Backfill concluído!');
  }
}

run().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
