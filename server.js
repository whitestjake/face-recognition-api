import express from 'express';
import cors from "cors";
import knex from 'knex';
import  bcrypt  from 'bcryptjs';

const postgres = knex({
    client: 'pg',
    connection: {
      connectionString : process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }

    }
});

const app = express ();

app.use(express.json());
app.use(cors());

app.get('/', (req, res)=> {

    res.send("it works! bet you didnt expect that one");

});

app.post('/signin', (req, res) => {
    postgres.select("hash", "email").from("login")
        .where('email', '=', req.body.email)
        .then(data => {
            const isValid = bcrypt.compareSync(req.body.password, data[0].hash)
            if (isValid) {
                return postgres.select('*').from('users')
                    .where('email', '=', req.body.email)
                    .then(user => {
                        res.json(user[0])
                    })
                    .catch(err => res.status(400).json('unable to get user'))
            } else {
                res.status(400).json('wrong credentials')
            }
        })
        .catch(err => res.status(400).json('Invalid Form Submission'))
});

app.post('/register', (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password){
        return res.status(400).json(`incorrect form submission`)
    }
    const hash = bcrypt.hashSync(password)

    console.log(name, email, password)
    console.log(hash)

    postgres.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email
        })
        .into("login")
        .returning("email")
        .then(loginEmail => {
            console.log(loginEmail)
            return trx("users")
                .returning("*")
                .insert({
                    email: loginEmail[0].email,
                    name: name,
                    joined: new Date()
                })
                .then(user => {
                    res.json(user[0]);
                })
                .then(trx.commit)
                .catch(trx.rollback)
        })
        .catch( err => res.status(400).json("unable to register"))
    })  
});

app.get('/profile/:id', (req, res) => {

    const { id } = req.params;

    postgres.select('*').from('users').where({id})
    .then(user => {
        if (user.length) {
            res.json(user[0])
        } else {
            res.status(400).json('Not Found')
        }
    })
    .catch(err => res.status(400).json('error getting user'))

})

app.put('/image', (req, res) => {

    const { id } = req.body;

    postgres('users').where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then(entries => {
        res.json(entries[0].entries)
    })
    .catch(err => res.status(400).json("unable to get entries"))
})

app.listen(process.env.PORT || 3690, ()=> {

    console.log(`app is running on port ${process.env.PORT}`);

})





