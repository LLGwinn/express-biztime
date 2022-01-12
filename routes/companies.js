const express = require('express');
const ExpressError = require('../expressError');
const db = require('../db');
const router = new express.Router();

router.get('/', async function(req, res, next) {
    try {
        const result = await db.query( `SELECT * FROM companies` );

        return res.json({companies: result.rows})
    } 
    catch(err) {
        return next(err);
    } 
})

router.get('/:code', async function(req, res, next) {
    try {
        const code = req.params.code;
        // const result = await db.query( 
        //     `SELECT * 
        //      FROM companies
        //      INNER JOIN invoices
        //      ON code=comp_code 
        //      WHERE code=$1`, 
        //      [code] );
        const compQuery = await db.query (
            `SELECT *
             FROM companies
             WHERE code=$1`,
             [code]
        );

        const invQuery = await db.query(
            `SELECT id, amt, paid, add_date, paid_date
             FROM invoices
             WHERE comp_code=$1`,
             [code]
        );

        const {name, description} = compQuery.rows[0];
        const invoices = invQuery.rows;
        
        if (compQuery.rows.length === 0) {
            throw new ExpressError(`Can't find company with code '${code}'`, 404);
        }

        return res.send({company: {code, name, description,
                         invoices: invoices }})
    }
    catch(err) {
        return next(err);
    }
})

router.post('/', async function(req, res, next) {
    try {
        const { code, name, description } = req.body;
        const result = await db.query( 
            `INSERT INTO companies (code, name, description) 
             VALUES ($1, $2, $3) 
             RETURNING code, name, description`,
             [code, name, description]
        );

        return res.status(201).send({company: {code, name, description}})
    }
    catch(err) {
        return next(err);
    }
})

router.put('/:code', async function(req, res, next) {
    try {
        const { code, name, description } = req.body;

        const result = await db.query( 
            `UPDATE companies SET code=$1, name=$2, description=$3
             WHERE code=$4
             RETURNING code, name, description`,
             [code, name, description, req.params.code]
        );

        if (result.rows.length === 0) {
            throw new ExpressError(`Can't find company with code '${req.params.code}'`, 404)
        }

        return res.send({company: {code, name, description}})
    }
    catch(err) {
        return next(err);
    }
})

router.delete('/:code', async function(req, res, next) {
    try {
        const result = await db.query( 
            `DELETE FROM companies
             WHERE code=$1
             RETURNING code`,
             [req.params.code]
        );

        if (result.rows.length === 0) {
            throw new ExpressError(`Can't find company with code '${req.params.code}'`, 404)
        }

        return res.send({status: "deleted"})
    }
    catch(err) {
        return next(err);
    }
})

module.exports = router;