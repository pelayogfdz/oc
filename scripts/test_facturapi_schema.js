const Facturapi = require('facturapi').default || require('facturapi');

// Using standard test key or inspecting Facturapi endpoint error
const facturapi = new Facturapi('sk_test_oNq4w8E7R7JjL1pQ4vK8mY2xZ9aB3cD5e'); // dummy test key format

async function testSchema(payloadVariant) {
  try {
    console.log('Testing payload:', JSON.stringify(payloadVariant, null, 2));
    const res = await facturapi.invoices.create(payloadVariant);
    console.log('Success:', res.id);
  } catch(e) {
    console.log('Error message:', e.message);
    if (e.response && e.response.data) {
      console.log('Error details:', JSON.stringify(e.response.data, null, 2));
    }
  }
}

async function run() {
  // Variant A: documents array inside related_documents object
  console.log('--- Variant A: { relationship: "01", documents: ["UUID"] } ---');
  await testSchema({
    customer: {
      legal_name: 'PUBLICO EN GENERAL',
      tax_id: 'XAXX010101000',
      tax_system: '616',
      address: { zip: '01000' }
    },
    items: [
      {
        product: {
          description: 'Devolución de mercancía',
          product_key: '84111506',
          price: 100,
          tax_included: true,
          unit_key: 'H87'
        },
        quantity: 1
      }
    ],
    type: 'E',
    payment_form: '15',
    use: 'G02',
    related_documents: [
      {
        relationship: '01',
        documents: ['8B52CBCD-C956-4717-A1BD-02E57386AAA2']
      }
    ]
  });

  // Variant B: { relationship: "01", uuid: "UUID" }
  console.log('\n--- Variant B: { relationship: "01", uuid: "UUID" } ---');
  await testSchema({
    customer: {
      legal_name: 'PUBLICO EN GENERAL',
      tax_id: 'XAXX010101000',
      tax_system: '616',
      address: { zip: '01000' }
    },
    items: [
      {
        product: {
          description: 'Devolución de mercancía',
          product_key: '84111506',
          price: 100,
          tax_included: true,
          unit_key: 'H87'
        },
        quantity: 1
      }
    ],
    type: 'E',
    payment_form: '15',
    use: 'G02',
    related_documents: [
      {
        relationship: '01',
        uuid: '8B52CBCD-C956-4717-A1BD-02E57386AAA2'
      }
    ]
  });
}

run();
