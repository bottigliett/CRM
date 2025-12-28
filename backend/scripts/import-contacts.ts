import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mapping vecchi tipi -> nuovi tipi
const typeMapping: Record<string, 'COLLABORATION' | 'USEFUL_CONTACT' | 'PROSPECT' | 'CLIENT'> = {
  'lead': 'PROSPECT', // I lead diventano prospect
  'prospect': 'PROSPECT',
  'client': 'CLIENT',
  'collaborazioni': 'COLLABORATION',
  'contatto_utile': 'USEFUL_CONTACT',
  'inactive': 'PROSPECT', // Gli inattivi li mettiamo come prospect
}

const contacts = [
  {
    id: 36,
    name: 'Immobiliare Villafranca SRL (Alexandru Adam)',
    type: 'client',
    email: 'vr2oe@tecnorete.it',
    phone: '+39 329 476 5308',
    partitaIva: '04558700235',
    address: 'Via Pace 45 - 37069 Villafranca VR',
  },
  {
    id: 37,
    name: 'Jessica Longo',
    type: 'collaborazioni',
    email: 'jessicalongo126@gmail.com',
    phone: '+39 345 333 6760',
  },
  {
    id: 38,
    name: 'Darco Mal Pra',
    type: 'collaborazioni',
    email: 'hello@darcomalpra.com',
  },
  {
    id: 39,
    name: 'Vincenzo Di Gioia',
    type: 'collaborazioni',
    email: 'vincenzodigioia1999@gmail.com',
    phone: '3453798257',
  },
  {
    id: 40,
    name: 'Eva Pasetto',
    type: 'collaborazioni',
    email: 'eva.pasetto2003@gmail.com',
    phone: '3342272036',
  },
  {
    id: 41,
    name: 'Augusto Bove',
    type: 'collaborazioni',
    email: 'augusto.bove@hotmail.it',
    phone: '+39 3485153744',
  },
  {
    id: 42,
    name: 'Marco Leorin',
    type: 'collaborazioni',
    email: 'l.marco.002@gmail.com',
    phone: '3317456985',
  },
  {
    id: 43,
    name: 'ValeDent (Serimedical S.R.L.)',
    type: 'client',
    email: 'irene.amorelli@serimedical.it',
    partitaIva: '04559200235',
  },
  {
    id: 44,
    name: 'Matteo Caldera',
    type: 'contatto_utile',
    phone: '+39 340 162 4816',
  },
  {
    id: 45,
    name: 'Cheese Break Bistrot',
    type: 'prospect',
    email: 'marangonidavide05@gmail.com',
    phone: '392 9355725',
  },
  {
    id: 46,
    name: 'Mia Forniture',
    type: 'prospect',
    email: 'office@miaforniture.it',
    phone: '+39 347 271 8137',
  },
  {
    id: 47,
    name: 'Tecnorete Pedemonte',
    type: 'prospect',
  },
  {
    id: 48,
    name: 'Agenzia Immobiliare Santa Croce',
    type: 'inactive',
  },
  {
    id: 49,
    name: 'Mantovani Ittici',
    type: 'prospect',
    email: 'info@mantovaniprodottiittici.it',
    phone: '+39 348 360 9937',
  },
  {
    id: 50,
    name: 'Bedat SRL',
    type: 'prospect',
    email: 'mismostudiodesign@gmail.com',
  },
  {
    id: 56,
    name: 'PagheSolution',
    type: 'client',
    email: 'info@paghesolution.it',
    phone: '3938658960',
    partitaIva: 'IT04685780233',
  },
  {
    id: 57,
    name: 'Alessandro Acquaviva',
    type: 'client',
  },
  {
    id: 58,
    name: 'Marco Frezza',
    type: 'client',
    email: 'marangonidavide05@gmail.com',
    phone: '+39 351 776 6541',
    codiceFiscale: 'FRZMRC72H10G843T',
  },
  {
    id: 59,
    name: 'Commercialista Squarzoni',
    type: 'contatto_utile',
    email: 'studio.squarzoni@studiosquarzoni.com',
    phone: '045 8104214',
  },
  {
    id: 60,
    name: 'Tecnorete Bussolengo',
    type: 'prospect',
    email: 'vr2o3@tecnorete.it',
    phone: '3345469879',
  },
  {
    id: 61,
    name: 'Lorenzo Cordioli',
    type: 'collaborazioni',
    email: 'lorcor1999@gmail.com',
  },
  {
    id: 63,
    name: 'MC Solutions',
    type: 'client',
    email: 'info@mcsol.it',
    phone: '+393475738080',
    partitaIva: 'IT04621440231',
  },
  {
    id: 64,
    name: 'Sofia De Cupertinis',
    type: 'collaborazioni',
    email: 'sofidecupertinis24@gmail.com',
    phone: '+39 3898588579',
  },
  {
    id: 65,
    name: 'Angelica Fornalè',
    type: 'collaborazioni',
    email: 'angelicafornale@gmail.com',
  },
  {
    id: 66,
    name: 'Nicoletta Sartori (Mary Joans Apartment)',
    type: 'prospect',
    email: 'maryjoansapartment@gmail.com',
    phone: '+393477768562',
  },
  {
    id: 67,
    name: 'Giulia Selmo',
    type: 'collaborazioni',
    email: 'giulia.selmo@allievi.itsdigitalacademy.com',
    phone: '+39 3515000411',
  },
  {
    id: 68,
    name: 'Alice Gianotti',
    type: 'collaborazioni',
    email: 'aalice.gianotti@gmail.com',
    phone: '+39 345 178 4001',
  },
  {
    id: 69,
    name: 'Paolo Pollipoli',
    type: 'collaborazioni',
    email: 'paolo@a-positivo.it',
    phone: '+39 333 35 24 475',
  },
  {
    id: 70,
    name: 'Alice Bianchi',
    type: 'collaborazioni',
    email: 'alice1992b@gmail.com',
    phone: '+393474892945',
  },
  {
    id: 71,
    name: 'Tommaso Quintarelli',
    type: 'collaborazioni',
    email: 'tommyzalfa@gmail.com',
  },
  {
    id: 72,
    name: 'Michela Canil',
    type: 'collaborazioni',
    email: 'canil.michela@icloud.com',
    phone: '+393402188668',
  },
  {
    id: 73,
    name: 'Immobiliare Vigasio S.R.L. (Giacomo Visciglia)',
    type: 'prospect',
    email: 'vrhsg@tecnocasa.it',
  },
  {
    id: 74,
    name: 'Maddalena Dalle Pezze',
    type: 'collaborazioni',
    email: 'dallepezzemaddalena@gmail.com',
    phone: '+39 346 845 5337',
    codiceFiscale: 'DLLMDL99E70F861Z',
  },
  {
    id: 75,
    name: 'The soda jerk',
    type: 'lead',
    phone: '0452375108',
  },
  {
    id: 76,
    name: 'FRZ Lab',
    type: 'lead',
    email: 'frizzante.lab@gmail.com',
  },
  {
    id: 77,
    name: 'White Monkey',
    type: 'lead',
    phone: '+393401917580',
  },
  {
    id: 78,
    name: "L'Alchimista",
    type: 'lead',
    phone: '+393780667939',
  },
  {
    id: 79,
    name: 'Fluxin Shop',
    type: 'lead',
    phone: '045514819',
  },
  {
    id: 80,
    name: 'Officina VR',
    type: 'lead',
    phone: '045 801 0009',
  },
  {
    id: 81,
    name: 'Toniolo',
    type: 'lead',
  },
  {
    id: 82,
    name: 'DETAILING GARAGE',
    type: 'lead',
    phone: '345293599',
  },
  {
    id: 83,
    name: 'Pikko gelateria',
    type: 'lead',
    phone: '+39 351 5480896',
  },
  {
    id: 84,
    name: 'Silvia Crisettig',
    type: 'collaborazioni',
    email: 'silvia.crisettig@gmail.com',
    phone: '+39 347 3139254',
  },
  {
    id: 85,
    name: 'Gelateria California',
    type: 'lead',
  },
  {
    id: 86,
    name: 'Dottor Kamal',
    type: 'lead',
    phone: '045 8969122',
  },
  {
    id: 87,
    name: 'Alessandro Apostoli',
    type: 'collaborazioni',
    email: 'alessandroapostoli77@gmail.com',
  },
  {
    id: 88,
    name: 'Mario Pili',
    type: 'collaborazioni',
    email: 'mario.pili6199@gmail.com',
    phone: '+393913523551',
  },
  {
    id: 89,
    name: 'Relais Rossar',
    type: 'lead',
    email: 'info@relaisrossar.it',
    phone: '+39 045 725 6642',
  },
  {
    id: 90,
    name: 'greenvillegraficaestampa',
    type: 'lead',
  },
  {
    id: 91,
    name: 'Easyou',
    type: 'lead',
    email: 'giulia.crestan@gmail.com',
  },
  {
    id: 92,
    name: 'ValpoStay',
    type: 'lead',
    email: 'meri.marconi97@gmail.com',
    phone: '+39 348 649 6146',
  },
  {
    id: 93,
    name: 'Valpostay',
    type: 'client',
    email: 'meri.marconi97@gmail.com',
    phone: '+39 348 649 6146',
  },
  {
    id: 94,
    name: 'Industriale Cremona SRL (Nicola Gervasi)',
    type: 'client',
    email: 'nicolagervasi04@gmail.com',
    phone: '3347039702',
    partitaIva: 'IT01765290190',
  },
  {
    id: 95,
    name: 'Immobiliare Zenorini',
    type: 'lead',
    phone: '340/1652650',
  },
  {
    id: 96,
    name: 'Studio Grezzana Nuova SNC (Brian Prati)',
    type: 'prospect',
  },
  {
    id: 97,
    name: 'Erica De Lucchi',
    type: 'collaborazioni',
    email: 'erica.delucchi2000@gmail.com',
    phone: '+39 348 242 6340',
  },
  {
    id: 98,
    name: 'Principe di Ragada',
    type: 'lead',
  },
  {
    id: 99,
    name: 'La Stueta',
    type: 'lead',
    phone: '0452232232',
  },
  {
    id: 100,
    name: 'Glow Chic',
    type: 'prospect',
    email: 'glowchicsnc@gmail.com',
    phone: '045 8580688',
    partitaIva: 'IT05139220239',
  },
  {
    id: 101,
    name: 'Sara Lonardi',
    type: 'collaborazioni',
    email: 'saralonardi@icloud.com',
    phone: '+39 3452125159',
    partitaIva: '05096850234',
  },
  {
    id: 102,
    name: 'Lorenzo Pompele',
    type: 'collaborazioni',
    email: 'pompelelorenzo@gmail.com',
    phone: '3398190085',
  },
  {
    id: 105,
    name: 'Alessandro Trevisan',
    type: 'collaborazioni',
    email: 'ale3v@outlook.com',
    phone: '3405492054',
  },
  {
    id: 106,
    name: 'Bigger Burger',
    type: 'lead',
  },
  {
    id: 107,
    name: 'Fondazione De Carneri',
    type: 'prospect',
    email: 'stefano@mismo.studio',
    phone: '+39 02 28900393',
  },
  {
    id: 108,
    name: 'Tatjana Bezzornia',
    type: 'collaborazioni',
    email: 'tatjanabezzornia@gmail.com',
    phone: '‭+39 345 6086114‬',
  },
  {
    id: 109,
    name: 'Marta Robiglio',
    type: 'collaborazioni',
    email: 'marta.robiglio@gmail.com',
  },
  {
    id: 110,
    name: 'Carlotta Cavalieri',
    type: 'collaborazioni',
    email: 'carlotta.cavalieri5@gmail.com',
  },
  {
    id: 111,
    name: 'Palma ADV',
    type: 'lead',
  },
  {
    id: 112,
    name: 'Sara Salvatore',
    type: 'collaborazioni',
    email: 'sara.salvatore@hotmail.it',
    phone: '+393381480671',
    partitaIva: '09593040968',
  },
  {
    id: 113,
    name: 'Sofia Maria Chiaffoni',
    type: 'collaborazioni',
    email: 'sofiachiaffoni@gmail.com',
    phone: '+393890687484',
  },
  {
    id: 114,
    name: 'Nicola Presti',
    type: 'collaborazioni',
    email: 'prestinicola02@gmail.com',
  },
  {
    id: 115,
    name: 'Samuele Ballarini',
    type: 'collaborazioni',
    email: 'samuele.ballarini@gmail.com',
    phone: '3459687093',
  },
  {
    id: 116,
    name: 'Micol Boschetti',
    type: 'collaborazioni',
    email: 'micol.boschetti@gmail.com',
    phone: '(+39) 347 8369103',
  },
  {
    id: 117,
    name: 'Nikola Sitnic',
    type: 'collaborazioni',
    email: 'nikola.sitnic@gmail.com',
  },
  {
    id: 118,
    name: 'Laura Bellati',
    type: 'collaborazioni',
    email: 'bellatilaura06@gmail.com',
    phone: '+39 340 94 132 51',
  },
  {
    id: 119,
    name: 'Chiara Frantuzzi',
    type: 'collaborazioni',
    email: 'chiafantuzzi@gmail.com',
    phone: '+39 370 333 2328',
  },
  {
    id: 121,
    name: 'Marco Paganotto',
    type: 'collaborazioni',
    email: 'pgn.mrc0@gmail.com',
    phone: '+39 328 3637 458',
    partitaIva: '05120520233',
  },
  {
    id: 122,
    name: 'Patrizia Giacomazzi',
    type: 'collaborazioni',
    email: 'gc.patrizia.art@gmail.com',
  },
  {
    id: 123,
    name: 'Chiara Pigaiani',
    type: 'collaborazioni',
    email: 'chiara.pigaiani@gmail.com',
    phone: '+393423263235',
  },
  {
    id: 124,
    name: 'Mario Rossi Srl',
    type: 'client',
    email: 'marangonidavide05@gmail.com',
    partitaIva: 'IT05052740239',
  },
  {
    id: 125,
    name: 'Studio Bardolino SRL (Pietro Oltramari)',
    type: 'prospect',
    email: 'olzipicla10@gmail.com',
    phone: '+393479075481',
    partitaIva: 'IT05103220231',
  },
  {
    id: 126,
    name: 'Albert Minibaev',
    type: 'collaborazioni',
    email: 'albi.minibaev@gmail.com',
    phone: '3883779894',
  },
  {
    id: 127,
    name: 'Chiara Scattolon',
    type: 'collaborazioni',
    email: 'scattolonchiara@gmail.com',
    phone: '+393408708406',
  },
  {
    id: 128,
    name: 'Claudio Bressan',
    type: 'collaborazioni',
    email: 'claudiobressandesign@gmail.com',
  },
  {
    id: 129,
    name: 'Pippo Baudo Srl',
    type: 'client',
    email: 'marangonidavide05@gmail.com',
    phone: '3275995680',
  },
]

async function main() {
  console.log('🚀 Inizio import contatti...\n')

  for (const contact of contacts) {
    const oldType = contact.type as string
    const newType = typeMapping[oldType] || 'COLLABORATION'

    try {
      await prisma.contact.upsert({
        where: { id: contact.id },
        update: {
          name: contact.name,
          type: newType,
          email: contact.email || null,
          phone: contact.phone || null,
          partitaIva: contact.partitaIva || null,
          codiceFiscale: contact.codiceFiscale || null,
          address: contact.address || null,
        },
        create: {
          id: contact.id,
          name: contact.name,
          type: newType,
          email: contact.email || null,
          phone: contact.phone || null,
          partitaIva: contact.partitaIva || null,
          codiceFiscale: contact.codiceFiscale || null,
          address: contact.address || null,
        },
      })

      console.log(
        `✅ ${contact.name.padEnd(50)} | ${oldType.padEnd(15)} → ${newType}`
      )
    } catch (error) {
      console.error(`❌ Errore importando ${contact.name}:`, error)
    }
  }

  console.log('\n✨ Import completato!')

  // Statistiche finali
  const stats = await prisma.contact.groupBy({
    by: ['type'],
    _count: true,
  })

  console.log('\n📊 Statistiche contatti:')
  stats.forEach((stat) => {
    console.log(`   ${stat.type}: ${stat._count} contatti`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
