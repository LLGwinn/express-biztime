const express = require('express');
const ExpressError = require('../expressError');
const db = require('../db');
const router = new express.Router();

router.get('/', async function(req, res, next) {
    try {
        const result = await db.query( `SELECT * FROM invoices` );

        return res.json({invoices: result.rows})
    } 
    catch(err) {
        return next(err);
    } 
})

router.get('/:id', async function(req, res, next) {
    try {
        const id = +req.params.id;

        const result = await db.query( 
            `SELECT * 
             FROM invoices
             INNER JOIN companies
             ON comp_code=code
             WHERE id=$1`, [id] );
        
        if (result.rows.length === 0) {
            throw new ExpressError(`Can't find invoice with id '${id}'`, 404);
        }

        const { amt, paid, add_date, paid_date, code, name, description } = result.rows[0];


        return res.send({invoice: {id, amt, paid, add_date, paid_date, 
                         company: {code, name, description}}
                        })
    }
    catch(err) {
        return next(err);
    }
})

router.post('/', async function(req, res, next) {
    try {
        const { comp_code, amt } = req.body;

        const result = await db.query( 
            `INSERT INTO invoices (comp_code, amt) 
             VALUES ($1, $2) 
             RETURNING id, comp_code, amt, paid, add_date, paid_date`,
             [comp_code, amt]
        );
    
        const { id, paid, add_date, paid_date } = result.rows[0];

        return res.status(201).send({invoice: {id, comp_code, amt, paid, add_date, paid_date}})
    }
    catch(err) {
        return next(err);
    }
})

router.put('/:id', async function(req, res, next) {
    try {
        // const amt = req.body.amt;

        // const result = await db.query( 
        //     `UPDATE invoices SET amt=$1
        //      WHERE id=$2
        //      RETURNING id, comp_code, amt, paid, add_date, paid_date`,
        //      [amt, +req.params.id]
        // );


        // if (result.rows.length === 0) {
        //     throw new ExpressError(`Can't find invoice with id '${req.params.id}'`, 404)
        // }

        // const { id, comp_code, paid, add_date, paid_date } =  result.rows[0];

        // return res.send({invoice: {id, comp_code, amt, paid, add_date, paid_date}})
        let {amt, paid} = req.body;
        let paidDate = null;
    
        const paidStatus = await db.query(
              `SELECT paid, paid_date FROM invoices WHERE id = $1`, [req.params.id]);
   
        if (paidStatus.rows.length === 0) {
          throw new ExpressError(`Can't find invoice with id '${req.params.id}'`, 404);
        }
    
        const currPaidDate = paidStatus.rows[0].paid_date;
    
        if (!currPaidDate && paid) {
            paidDate = new Date();
        } else if (!paid) {
          paidDate = null
        } else {
          paidDate = currPaidDate;
        }

        const result = await db.query(
              `UPDATE invoices
               SET amt=$1, paid=$2, paid_date=$3
               WHERE id=$4
               RETURNING id, comp_code, amt, paid, add_date, paid_date`,
               [amt, paid, paidDate, req.params.id]);
    
        return res.json({invoice: result.rows[0]}); 
    }
    catch(err) {
        return next(err);
    }
})

router.delete('/:id', async function(req, res, next) {
    try {
        const result = await db.query( 
            `DELETE FROM invoices
             WHERE id=$1
             RETURNING id`,
             [+req.params.id]
        );

        if (result.rows.length === 0) {
            throw new ExpressError(`Can't find invoice with id '${req.params.id}'`, 404)
        }

        return res.send({status: "deleted"})
    }
    catch(err) {
        return next(err);
    }
})

module.exports = router;