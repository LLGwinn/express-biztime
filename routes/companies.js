const express = require('express');
const ExpressError = require('../expressError');
const db = require('../db');
const router = new express.Router();
const slugify = require('slugify');

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

        const indQuery = await db.query(
            `SELECT * FROM companies_industries AS ci
             INNER JOIN industries AS i
             ON ci.ind_code=i.code
             WHERE ci.comp_code=$1`,
             [code]
        )

        if (compQuery.rows.length === 0) {
            throw new ExpressError(`Can't find company with code '${code}'`, 404);
        }

        const {name, description} = compQuery.rows[0];
        const industries = indQuery.rows.map(i => i.industry);
        const invoices = invQuery.rows;
        
        return res.send({company: {code, name, description,
            industries: industries, invoices: invoices }})
    }
    catch(err) {
        return next(err);
    }
})

router.post('/', async function(req, res, next) {
    try {
        const { name, description } = req.body;
        const code = slugify(name, {lower:true});

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