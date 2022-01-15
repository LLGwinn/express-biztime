process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../app');
const db = require('../db');

let testCompany;
let testInvoice;

/** ADD TABLES AND TEST COMPANY/TEST INVOICE TO DB */

beforeEach(async function() {
    let result = await db.query(`
        INSERT INTO companies (code, name, description)
        VALUES ('test', 'testComp', 'Test Company.')
        RETURNING code, name, description`);
    testCompany = result.rows[0];

    result = await db.query(`
        INSERT INTO invoices (comp_code, amt)
        VALUES ('test', '888')
        RETURNING id, comp_code, amt, paid, add_date, paid_date`);
    testInvoice = result.rows[0];
});

/** REMOVE RECORDS FROM TABLES, DISCONNECT DB */

afterEach(async function() {
    await db.query('DELETE FROM companies');
    await db.query('DELETE FROM invoices');
});

afterAll(async function() {
    await db.end();
});

/** BEGIN TESTS */

describe('GET /invoices', () => {
    test ('Get all invoices', async() => {
        const res = await request(app).get('/invoices');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({invoices: [{
            id:testInvoice.id, amt:testInvoice.amt, comp_code:testInvoice.comp_code, paid:testInvoice.paid,
            add_date:expect.any(String), paid_date:testInvoice.paid_date
        }]})
    })
    test('Return empty array if no invoices', async() => {
        const empty = await db.query(`DELETE FROM invoices`)
        const res = await request(app).get('/invoices');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({invoices: []})
    })
})

describe('GET /invoices/:id', () => {
    test ('Get info for invoice with id specified in route', async() => {
        const res = await request(app).get(`/invoices/${testInvoice.id}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(
            {invoice: {id:testInvoice.id, amt:testInvoice.amt, paid:testInvoice.paid, 
                add_date:expect.any(String), paid_date:testInvoice.paid_date, 
                company: {code:testCompany.code, name:testCompany.name, description:testCompany.description}}
               }
        )
    })
    test ('Throw error if id specified in route is not found', async() => {
        const res = await request(app).get(`/invoices/99999`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(
            {"error": {
                    "message": "Can't find invoice with id '99999'",
                    "status": 404
                }
            }
        )
    })
})

describe('POST/invoices', () => {
    test ('Create new invoice', async() => {
        const res = await request(app)
                    .post('/invoices')
                    .send({comp_code:'test', amt:100000});

        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({invoice: {id:expect.any(Number), comp_code:'test', amt:100000,
                        paid:false, add_date:expect.any(String), paid_date:null}})
    })
    test ('Throws error if no data received', async() => {
        const res = await request(app).post('/invoices');

        expect(res.statusCode).toBe(500);
    })
})

describe('PUT /invoices/:id', () => {
    test ('Change amt for invoice with id specified in route', async() => {
        const res = await request(app)
                    .put(`/invoices/${testInvoice.id}`)
                    .send({amt:99999, paid:true});

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(
            {invoice: {id:testInvoice.id, comp_code:testInvoice.comp_code, amt:99999, paid:true, 
                add_date:expect.any(String), paid_date:expect.any(String)}
            }
        )
    })
    test ('Throw error if id specified in route is not found', async() => {
        const res = await request(app)
                    .put(`/invoices/22222`)
                    .send({amt:99999});

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(
            {"error": {
                    "message": "Can't find invoice with id '22222'",
                    "status": 404
                }
            }
        )
    })
})

describe('DELETE /invoices/:id', () => {
    test ('Delete invoice with code specified in route', async() => {
        const res = await request(app).delete(`/invoices/${testInvoice.id}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({status: "deleted"});
        
        const empty = await request(app).get('/invoices');
        expect(empty.body).toEqual({invoices: []})
    })
    test ('Throw error if id specified in route is not found', async() => {
        const res = await request(app).delete(`/invoices/22222`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(
            {"error": {
                    "message": "Can't find invoice with id '22222'",
                    "status": 404
                }
            }
        )
    })
})