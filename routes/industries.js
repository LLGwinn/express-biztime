const express = require('express');
const ExpressError = require('../expressError');
const db = require('../db');
const router = new express.Router();

router.get('/', async function(req, res, next) {
    try {
        const result = await db.query( `SELECT * FROM industries`);
        let industries = result.rows

        for (let i of industries) {
            let compResult = await db.query( `SELECT *
                                              FROM companies_industries
                                              WHERE ind_code='${i.code}'`);
            console.log('COMPRESULT', compResult.rows)
            i.companies = compResult.rows.map(c => c.comp_code)  
        }

        return res.json(industries)
    } 
    catch(err) {
        return next(err);
    } 
})

router.post('/', async function(req, res, next) {
    try {
        const { code, industry } = req.body;

        const result = await db.query( 
            `INSERT INTO industries (code, industry) 
             VALUES ($1, $2) 
             RETURNING code, industry`,
             [code, industry]
        );

        return res.status(201).send({industry: {code, industry}})
    }
    catch(err) {
        return next(err);
    }
})

router.post('/:ind_code', async function(req, res, next) {
    try {
        const { comp_code } = req.body;

        const result = await db.query( 
            `INSERT INTO companies_industries (comp_code, ind_code)
             VALUES ($1, $2)
             RETURNING ind_code, comp_code`,
             [comp_code, req.params.ind_code]
        );

        if (result.rows.length === 0) {
            throw new ExpressError(`Can't find industry with code '${req.params.ind_code}'`, 404)
        }

        return res.send({association: result.rows})
    }
    catch(err) {
        return next(err);
    }
})

module.exports = router;