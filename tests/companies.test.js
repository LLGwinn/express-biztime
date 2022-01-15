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

describe('GET /companies', () => {
    test ('Get all companies', async() => {
        const res = await request(app).get('/companies');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({companies: [testCompany]})
    })
    test('Return empty array if no companies', async() => {
        const empty = await db.query(`DELETE FROM companies`)
        const res = await request(app).get('/companies');

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({companies: []})
    })
})

describe('GET /companies/:code', () => {
    test ('Get info for company with code specified in route', async() => {
        const res = await request(app).get(`/companies/${testCompany.code}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(
            {company: {code:testCompany.code, name:testCompany.name, description:testCompany.description,
                invoices: [{id:testInvoice.id, amt:testInvoice.amt, paid:testInvoice.paid,
                add_date:expect.any(String), paid_date:testInvoice.paid_date}] }}
        )
    })
    test ('Throw error if code specified in route is not found', async() => {
        const res = await request(app).get(`/companies/BADCODE`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(
            {"error": {
                    "message": "Can't find company with code 'BADCODE'",
                    "status": 404
                }
            }
        )
    })
})

describe('POST/companies', () => {
    test ('Create new company', async() => {
        const res = await request(app)
                    .post('/companies')
                    .send({name:'testComp2', description:'Second test company.'});

        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({company: {code:'testcomp2', name:'testComp2', description:'Second test company.'}})
    })
    test ('Throws error if no data received', async() => {
        const res = await request(app).post('/companies');

        expect(res.statusCode).toBe(500);
    })
})

describe('PUT /companies/:code', () => {
    test ('Change info for company with code specified in route', async() => {
        const res = await request(app)
                    .put(`/companies/${testCompany.code}`)
                    .send({code:testCompany.code, name:'Changed Co.', description:testCompany.description});

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(
            {company: {'code':testCompany.code, name:'Changed Co.', description:testCompany.description}}
        )
    })
    test ('Throw error if code specified in route is not found', async() => {
        const res = await request(app)
                    .put(`/companies/BADCODE`)
                    .send({code:testCompany.code, name:'Changed Co.', description:testCompany.description});

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(
            {"error": {
                    "message": "Can't find company with code 'BADCODE'",
                    "status": 404
                }
            }
        )
    })
})

describe('DELETE /companies/:code', () => {
    test ('Delete company with code specified in route', async() => {
        const res = await request(app).delete(`/companies/${testCompany.code}`);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({status: "deleted"});
        
        const empty = await request(app).get('/companies');
        expect(empty.body).toEqual({companies: []})
    })
    test ('Throw error if code specified in route is not found', async() => {
        const res = await request(app).delete(`/companies/BADCODE`);

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(
            {"error": {
                    "message": "Can't find company with code 'BADCODE'",
                    "status": 404
                }
            }
        )
    })
})