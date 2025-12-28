import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
});

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

// Map SQL status to new ContactType
const mapStatus = (status: string): string => {
  const map: Record<string, string> = {
    'client': 'CLIENT',
    'prospect': 'PROSPECT',
    'lead': 'PROSPECT', // leads become prospects
    'collaborazioni': 'COLLABORATION',
    'contatto_utile': 'USEFUL_CONTACT',
    'inactive': 'PROSPECT'
  };
  return map[status] || 'PROSPECT';
};

// Expected contacts from SQL file (excluding leads with funnelStage)
const expectedContacts = [
  { id: 36, name: 'Immobiliare Villafranca SRL (Alexandru Adam)', email: 'vr2oe@tecnorete.it', phone: '+39 329 476 5308', partitaIva: '04558700235', address: 'Via Pace 45 - 37069 Villafranca VR', status: 'CLIENT' },
  { id: 37, name: 'Jessica Longo', email: 'jessicalongo126@gmail.com', phone: '+39 345 333 6760', status: 'COLLABORATION' },
  { id: 38, name: 'Darco Mal Pra', email: 'hello@darcomalpra.com', address: 'Venezia', status: 'COLLABORATION' },
  { id: 39, name: 'Vincenzo Di Gioia', email: 'vincenzodigioia1999@gmail.com', phone: '3453798257', status: 'COLLABORATION' },
  { id: 40, name: 'Eva Pasetto', email: 'eva.pasetto2003@gmail.com', phone: '3342272036', address: 'Via Capitello 5, Monteforte d\'Alpone (VR)', status: 'COLLABORATION' },
  { id: 41, name: 'Augusto Bove', email: 'augusto.bove@hotmail.it', phone: '+39 3485153744', status: 'COLLABORATION' },
  { id: 42, name: 'Marco Leorin', email: 'l.marco.002@gmail.com', phone: '3317456985', address: 'Via G.La Pira, Rubano', status: 'COLLABORATION' },
  { id: 43, name: 'ValeDent (Serimedical S.R.L.)', email: 'irene.amorelli@serimedical.it', partitaIva: '04559200235', address: 'CIRCONVALLAZIONE ORIANI, 6A 37122 VERONA (VR)', status: 'CLIENT' },
  { id: 44, name: 'Matteo Caldera', phone: '+39 340 162 4816', status: 'USEFUL_CONTACT' },
  { id: 45, name: 'Cheese Break Bistrot', email: 'marangonidavide05@gmail.com', phone: '392 9355725', address: 'Via Rezzola, 19 - 37066 Sommacampagna VR', status: 'PROSPECT' },
  { id: 46, name: 'Mia Forniture', email: 'office@miaforniture.it', phone: '+39 347 271 8137', address: 'Viale del Lavoro, 41/interno 6-corridoio, 37036 San Martino Buon Albergo (VR)', status: 'PROSPECT' },
  { id: 47, name: 'Tecnorete Pedemonte', address: 'Via Casette 13 - 37024 Santa Maria di Negrar di Valpolicella', status: 'PROSPECT' },
  { id: 48, name: 'Agenzia Immobiliare Santa Croce', address: 'Via Giuseppe Verdi, 7/D, 37121 Verona VR', status: 'PROSPECT' },
  { id: 49, name: 'Mantovani Ittici', email: 'info@mantovaniprodottiittici.it', phone: '+39 348 360 9937', address: 'Via Raffa, 6, 37054 Nogara VR', status: 'PROSPECT' },
  { id: 50, name: 'Bedat SRL', email: 'mismostudiodesign@gmail.com', status: 'PROSPECT' },
  { id: 51, name: 'Manu Creation Home', email: 'marangonidavide05@gmail.com', status: 'PROSPECT' },
  { id: 52, name: 'Officina18', email: 'marangonidavide05@gmail.com', address: 'Via N.Copernico 18 - Verona', status: 'PROSPECT' },
  { id: 53, name: 'Verona Green Movieland', address: 'Via N.Copernico 18 - 37135 Verona', status: 'PROSPECT' },
  { id: 54, name: 'Tecnocasa Padova Guizza', email: 'marangonidavide05@gmail.com', address: 'Via Guizza Conselvana, 62, 35125 Padova PD', status: 'PROSPECT' },
  { id: 55, name: 'Zephyra', email: 'mismostudiodesign@gmail.com', address: 'Pont-Saint-Martin (Aosta)', status: 'PROSPECT' },
  { id: 56, name: 'PagheSolution', email: 'info@paghesolution.it', phone: '3938658960', partitaIva: 'IT04685780233', address: 'VIA FRANCESCO CARMAGNOLA 32 - 37135 VERONA', status: 'CLIENT' },
  { id: 57, name: 'Alessandro Acquaviva', status: 'CLIENT' },
  { id: 58, name: 'Marco Frezza', email: 'marangonidavide05@gmail.com', phone: '+39 351 776 6541', codiceFiscale: 'FRZMRC72H10G843T', address: 'VIA BRENNERO 2 - 37014 CASTELNUOVO DEL GARDA (VR)', status: 'CLIENT' },
  { id: 59, name: 'Commercialista Squarzoni', email: 'studio.squarzoni@studiosquarzoni.com', phone: '045 8104214', address: 'Via Leone Pancaldo, 68 37138 Verona', status: 'USEFUL_CONTACT' },
  { id: 60, name: 'Tecnorete Bussolengo', email: 'vr2o3@tecnorete.it', phone: '3345469879', address: 'Piazzale Vittorio Veneto 97, 37012 Bussolengo Veneto, Italia', status: 'PROSPECT' },
  { id: 61, name: 'Lorenzo Cordioli', email: 'lorcor1999@gmail.com', address: 'Via Perloso 11 - Verona, Italia', status: 'COLLABORATION' },
  { id: 63, name: 'MC Solutions', email: 'info@mcsol.it', phone: '+393475738080', partitaIva: 'IT04621440231', address: 'Via don Angelo Vinco 2/C - 37015 Sant\'Ambrogio di Valpolicella (VR)', status: 'CLIENT' },
  { id: 64, name: 'Sofia De Cupertinis', email: 'sofidecupertinis24@gmail.com', phone: '+39 3898588579', address: 'Roma', status: 'COLLABORATION' },
  { id: 65, name: 'Angelica Fornalè', email: 'angelicafornale@gmail.com', address: 'Verona', status: 'COLLABORATION' },
  { id: 66, name: 'Nicoletta Sartori (Mary Joans Apartment)', email: 'maryjoansapartment@gmail.com', phone: '+393477768562', address: 'Via Lazzaro Spallanzani, Verona (FIERA)', status: 'PROSPECT' },
  { id: 67, name: 'Giulia Selmo', email: 'giulia.selmo@allievi.itsdigitalacademy.com', phone: '+39 3515000411', address: 'Valdagno (VI)', status: 'COLLABORATION' },
  { id: 68, name: 'Alice Gianotti', email: 'aalice.gianotti@gmail.com', phone: '+39 345 178 4001', address: 'Torino', status: 'COLLABORATION' },
  { id: 69, name: 'Paolo Pollipoli', email: 'paolo@a-positivo.it', phone: '+39 333 35 24 475', address: 'Viale del Brotton, 5 - Vicenza', status: 'COLLABORATION' },
  { id: 70, name: 'Alice Bianchi', email: 'alice1992b@gmail.com', phone: '+393474892945', address: 'Via Valmezzana 5 - Sermide e Felonica (MN) 46028', status: 'COLLABORATION' },
  { id: 71, name: 'Tommaso Quintarelli', email: 'tommyzalfa@gmail.com', address: 'Via Filippo Corridoni n 39, 37045 - Legnago, Verona', status: 'COLLABORATION' },
  { id: 72, name: 'Michela Canil', email: 'canil.michela@icloud.com', phone: '+393402188668', address: 'Treviso', status: 'COLLABORATION' },
  { id: 73, name: 'Immobiliare Vigasio S.R.L.', email: 'vrhsg@tecnocasa.it', address: 'Corso Giuseppe Garibaldi, 3/A 37068 Vigasio (VR)', status: 'PROSPECT' },
  { id: 74, name: 'Maddalena Dalle Pezze', email: 'dallepezzemaddalena@gmail.com', phone: '+39 346 845 5337', codiceFiscale: 'DLLMDL99E70F861Z', address: 'Via dell\'Aquilio 23/F Fane, Negrar di Valpolicella', status: 'COLLABORATION' },
  { id: 84, name: 'Silvia Crisettig', email: 'silvia.crisettig@gmail.com', phone: '+39 347 3139254', address: 'Udine', status: 'COLLABORATION' },
  { id: 87, name: 'Alessandro Apostoli', email: 'alessandroapostoli77@gmail.com', status: 'COLLABORATION' },
  { id: 88, name: 'Mario Pili', email: 'mario.pili6199@gmail.com', phone: '+393913523551', address: 'Via Francesco Da Levanto 34 - 37138 Verona', status: 'COLLABORATION' },
  { id: 93, name: 'Valpostay', email: 'meri.marconi97@gmail.com', phone: '+39 348 649 6146', status: 'CLIENT' },
  { id: 94, name: 'Industriale Cremona SRL', email: 'nicolagervasi04@gmail.com', phone: '3347039702', partitaIva: 'IT01765290190', address: 'CORSO VITTORIO EMANUELE II 13 - 26100 - CREMONA (CR)', status: 'CLIENT' },
  { id: 96, name: 'Studio Grezzana Nuova SNC', address: 'Via Roma, 84 37023 Grezzana (VR)', status: 'PROSPECT' },
  { id: 97, name: 'Erica De Lucchi', email: 'erica.delucchi2000@gmail.com', phone: '+39 348 242 6340', address: 'Verona', status: 'COLLABORATION' },
  { id: 100, name: 'Glow Chic', email: 'glowchicsnc@gmail.com', phone: '045 8580688', partitaIva: 'IT05139220239', address: 'Piazza Castello, 1, 37066 Sommacampagna VR', status: 'PROSPECT' },
  { id: 101, name: 'Sara Lonardi', email: 'saralonardi@icloud.com', phone: '+39 3452125159', partitaIva: '05096850234', address: 'Bussolengo', status: 'COLLABORATION' },
  { id: 102, name: 'Lorenzo Pompele', email: 'pompelelorenzo@gmail.com', phone: '3398190085', address: 'Via Bovolino 92, 37060 Marchesino', status: 'COLLABORATION' },
  { id: 105, name: 'Alessandro Trevisan', email: 'ale3v@outlook.com', phone: '3405492054', address: 'Via Giovanni Prati 2A – 37124 Verona (VR)', status: 'COLLABORATION' },
  { id: 107, name: 'Fondazione De Carneri', email: 'stefano@mismo.studio', phone: '+39 02 28900393', address: 'Via G. Ceradini 3, 20129 Milano', status: 'PROSPECT' },
  { id: 108, name: 'Tatjana Bezzornia', email: 'tatjanabezzornia@gmail.com', phone: '‭+39 345 6086114‬', status: 'COLLABORATION' },
  { id: 109, name: 'Marta Robiglio', email: 'marta.robiglio@gmail.com', status: 'COLLABORATION' },
  { id: 110, name: 'Carlotta Cavalieri', email: 'carlotta.cavalieri5@gmail.com', address: 'Mantova', status: 'COLLABORATION' },
  { id: 112, name: 'Sara Salvatore', email: 'sara.salvatore@hotmail.it', phone: '+393381480671', partitaIva: '09593040968', address: 'Via Sant\'Innocenzo, 28 20060 - Pozzuolo Martesana (MI)', status: 'COLLABORATION' },
  { id: 113, name: 'Sofia Maria Chiaffoni', email: 'sofiachiaffoni@gmail.com', phone: '+393890687484', address: 'Via Silvio Benini, 7, San Martino Buon Albergo, Verona', status: 'COLLABORATION' },
  { id: 114, name: 'Nicola Presti', email: 'prestinicola02@gmail.com', address: 'Cesena', status: 'COLLABORATION' },
  { id: 115, name: 'Samuele Ballarini', email: 'samuele.ballarini@gmail.com', phone: '3459687093', address: 'Via del Concilio 9A - Caselle di Sommacampagna (VR)', status: 'COLLABORATION' },
  { id: 116, name: 'Micol Boschetti', email: 'micol.boschetti@gmail.com', phone: '(+39) 347 8369103', address: 'Ferrara', status: 'COLLABORATION' },
  { id: 117, name: 'Nikola Sitnic', email: 'nikola.sitnic@gmail.com', address: 'Trento', status: 'COLLABORATION' },
  { id: 118, name: 'Laura Bellati', email: 'bellatilaura06@gmail.com', phone: '+39 340 94 132 51', address: 'Mantova', status: 'COLLABORATION' },
  { id: 119, name: 'Chiara Frantuzzi', email: 'chiafantuzzi@gmail.com', phone: '+39 370 333 2328', address: 'Via Nilde Iotti, 32 Fabbrico (RE)', status: 'COLLABORATION' },
  { id: 121, name: 'Marco Paganotto', email: 'pgn.mrc0@gmail.com', phone: '+39 328 3637 458', partitaIva: '05120520233', address: 'Berlino', status: 'COLLABORATION' },
  { id: 122, name: 'Patrizia Giacomazzi', email: 'gc.patrizia.art@gmail.com', address: 'Verona', status: 'COLLABORATION' },
  { id: 123, name: 'Chiara Pigaiani', email: 'chiara.pigaiani@gmail.com', phone: '+393423263235', address: 'Via Emilio Sereni 6, 37045, Legnago', status: 'COLLABORATION' },
  { id: 124, name: 'Mario Rossi Srl', email: 'marangonidavide05@gmail.com', partitaIva: 'IT05052740239', status: 'CLIENT' },
  { id: 125, name: 'Studio Bardolino SRL', email: 'olzipicla10@gmail.com', phone: '+393479075481', partitaIva: 'IT05103220231', address: 'Via Marconi, 32 37011 Bardolino (VR)', status: 'PROSPECT' },
  { id: 126, name: 'Albert Minibaev', email: 'albi.minibaev@gmail.com', phone: '3883779894', address: 'Bologna', status: 'COLLABORATION' },
  { id: 127, name: 'Chiara Scattolon', email: 'scattolonchiara@gmail.com', phone: '+393408708406', address: 'San Giorgio in Bosco (PD)', status: 'COLLABORATION' },
  { id: 128, name: 'Claudio Bressan', email: 'claudiobressandesign@gmail.com', address: 'Padova', status: 'COLLABORATION' },
  { id: 129, name: 'Pippo Baudo Srl', email: 'marangonidavide05@gmail.com', phone: '3275995680', address: 'Via Baudo 25', status: 'CLIENT' },
];

async function verifyAllContactsData() {
  try {
    console.log('=== VERIFYING ALL CONTACTS DATA ===\n');

    const issues: string[] = [];
    let checked = 0;
    let missingData = 0;

    for (const expected of expectedContacts) {
      checked++;

      const contact = await prisma.contact.findUnique({
        where: { id: expected.id }
      });

      if (!contact) {
        issues.push(`❌ ID ${expected.id}: ${expected.name} - NOT FOUND IN DATABASE`);
        continue;
      }

      const problems: string[] = [];

      // Check email
      if (expected.email && !contact.email) {
        problems.push(`missing email: ${expected.email}`);
      }

      // Check phone
      if (expected.phone && !contact.phone) {
        problems.push(`missing phone: ${expected.phone}`);
      }

      // Check address
      if (expected.address && !contact.address) {
        problems.push(`missing address: ${expected.address}`);
      }

      // Check P.IVA
      if (expected.partitaIva && !contact.partitaIva) {
        problems.push(`missing P.IVA: ${expected.partitaIva}`);
      }

      // Check CF
      if (expected.codiceFiscale && !contact.codiceFiscale) {
        problems.push(`missing CF: ${expected.codiceFiscale}`);
      }

      // Check type
      if (expected.status && contact.type !== expected.status) {
        problems.push(`wrong type: ${contact.type} (should be ${expected.status})`);
      }

      if (problems.length > 0) {
        missingData++;
        issues.push(`⚠️  ID ${expected.id}: ${expected.name}\n     ${problems.join('\n     ')}`);
      }
    }

    console.log(`Checked ${checked} contacts\n`);

    if (issues.length === 0) {
      console.log('✅ All contacts have complete data!');
    } else {
      console.log(`Found ${missingData} contacts with missing/incorrect data:\n`);
      issues.forEach(issue => console.log(issue + '\n'));
    }

  } catch (error) {
    console.error('Error verifying contacts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAllContactsData();
