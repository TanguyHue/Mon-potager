/* eslint-env node */
'use strict';

// Ce module nodejs gère l'API de notre site
// Il définit l'ensemble des routes (relative à "/api") corresponant aux 
// points d'entrée de l'API

// Expressjs
const express = require('express');
// Notre module nodejs d'accès simplifié à la base de données
const dbHelper = require('./dbhelper.js');
const app = express();

// Comme c'est un module nodejs il faut exporter les fonction qu'on veut rendre publiques
// ici on n'exporte qu'ne seule fonction (anonyme) qui est le "constructeur" du module
// Cette fonction prend en paramètre un objet "passport" pour la gestion de l'authentification 
module.exports = (passport) => {
    // Partie /plante

    app.get('/planteData', function (req, res, next) {
        dbHelper.PlanteData.all().then(
            planteData => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(planteData));
            },
            err => {
                next(err);
            },
        );
    });

    app.get('/planteData/:id', function (req, res, next) {
        dbHelper.PlanteData.byId(req.params.id).then(
            planteData => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(planteData));
            },
            err => {
                next(err);
            },
        );
    });

    app.get('/planteData/nom/:nom', function (req, res, next) {
        dbHelper.PlanteData.byNom(req.params.nom).then(
            planteData => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(planteData));
            },
            err => {
                next(err);
            },
        );
    });

    app.post('/planteData/add', function (req, res, next) {
        dbHelper.PlanteData.add(req.body.nom, req.body.intervalle_arrosage, req.body.conseils, req.body.engrais_conseille, req.body.img).then(
            planteData => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(planteData));
            },
            err => {
                next(err);
            },
        )
    });

    // Parti taches

    app.get('/taches', function (req, res, next) {
        dbHelper.taches.byEtat(0).then(
            taches => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(taches));
            },
            err => {
                next(err);
            },
        );
    });

    app.get('/taches/:idUser', function (req, res, next) {
        dbHelper.taches.byUser(req.params.idUser).then(
            taches => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(taches));
            },
            err => {
                next(err);
            },
        );
    });

    app.get('/tachesComplete/:idUser', function (req, res, next) {
        dbHelper.taches.byUserComplete(req.params.idUser).then(
            taches => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(taches));
            },
            err => {
                next(err);
            },
        );
    });

    app.post('/taches/changeEtat', function (req, res, next) {
        dbHelper.taches.changeEtat(req.body.id, req.body.etat).then(
            taches => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(taches));
            },
            err => {
                next(err);
            },
        )
    });

    app.post('/taches/changeRealisateur', function (req, res, next) {
        dbHelper.taches.changeRealisateur(req.body.id, req.body.realisateur).then(
            taches => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(taches));
            },
            err => {
                next(err);
            },
        )
    });

    app.post('/taches/add', function (req, res, next) {
        const idCreateur = req.body.idCreateur; 
        const idRealisateur = req.body.idRealisateur;
        const titre = req.body.titre;
        const date = req.body.date;
        const notes = req.body.notes;

        dbHelper.taches.addTache(idCreateur, idRealisateur, titre, date, notes).then(
            taches => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(taches));
            },
            err => {
                next(err);
            },
        );

    });

    app.post('/taches/remove', function (req, res, next) {
        dbHelper.taches.rmTache(req.body.id).then(
            taches => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(taches));
            },
            err => {
                next(err);
            },
        );

    });


    // Partie /login

    app.post('/login', function (req, res, next) {
        if (!req.body.username) {
            return res.send({ success: false, message: 'empty username' });
        }
        if (!req.body.password) {
            return res.send({ success: false, message: 'empty password' });
        }
        passport.authenticate('local', function (err, user) {
            if (err) {
                return next(err); // will generate a 500 error
            }
            if (!user) {
                return res.send({ succes: false, message: 'authentication failed' });
            }
            req.login(user, function (err) {
                if (err) {
                    return next(err);
                }
                return res.send({ success: true, message: 'authentication succeeded' });
            });
        })(req, res, next);
    });

    app.get('/login/:username/:password', function (req, res, next) {
        dbHelper.users.byUsername(req.params.username).then(
            user => {
                if (user.password === req.params.password) {
                    res.set('Content-type', 'application/json');
                    res.send(JSON.stringify(user));
                } else {
                    res.set('Content-type', 'application/json');
                    res.send(JSON.stringify({}));
                }
            },
            err => {
                next(err);
            },
        );
    });

    // Partie /user

    app.post('/user/add', function (req, res, next) {
        const adresse_mail = req.body.email;
        const password = req.body.password;
        const nom = req.body.nom;
        const prenom = req.body.prenom;
        const departement = req.body.departement;
        const langue = req.body.langue;
        const role = req.body.role;
        const etat = 0;

        dbHelper.users.addUser(adresse_mail, password, nom, prenom, departement, langue, role, etat).then(
            taches => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(taches));
            },
            err => {
                next(err);
            },
        );
    });

    app.post('/user/changeEtat', function (req, res, next) {
        const id = req.body.id;
        const etat = req.body.etat;

        dbHelper.users.changeEtat(id, etat).then(
            taches => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(taches));
            },
            err => {
                next(err);
            },
        );
    });

    app.get('/user/liste', function (req, res, next) {
        dbHelper.users.listeUsers().then(
            users => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(users));
            },
            err => {
                next(err);
            },
        );
    });

    app.get('/user/liste/:id', function (req, res, next) {
        dbHelper.users.listeUsersById(req.params.id).then(
            users => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(users));
            },
            err => {
                next(err);
            },
        );
    });

    // Partie /potager

    app.post('/potager/add', function (req, res, next) {
        const idUser = req.body.idUser; 
        const idPlante = req.body.idPlante;
        const x = req.body.x;
        const y = req.body.y;
        const date_recolte = req.body.date_recolte;
        const date_dernier_arrosage = req.body.date_dernier_arrosage;

        dbHelper.PlantePotager.addPotager(idUser, idPlante, x, y, date_recolte, date_dernier_arrosage).then(
            potagers => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(potagers));
            },
            err => {
                next(err);
            },
        );
    });

    app.get('/potager/byXandYandUser/:x/:y/:idUser', function (req, res, next) {
        const x = req.params.x; 
        const y = req.params.y;
        const idUser = req.params.idUser;

        dbHelper.PlantePotager.byXandYandUser(x, y, idUser).then(
            potagers => {
                if (potagers === undefined) {
                    potagers = null;
                }
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(potagers));
            },
            err => {
                next(err);
            },
        );

    });

    app.post('/potager/arrose', function (req, res, next) {
        const x = req.body.x; 
        const y = req.body.y;
        const idUser = req.body.idUser;
        const dateActuelle = new Date();
        let aujourdhui = '';
        let mois = '';
        let jour = '';
        if (dateActuelle.getMonth() < 10) {
            mois = '0' + (dateActuelle.getMonth() + 1);
        } else {
            mois = dateActuelle.getMonth() + 1;
        }

        if (dateActuelle.getDate() < 10) {
            jour = '0' + dateActuelle.getDate();
        } else {
            jour = dateActuelle.getDate();
        }

        let annee = dateActuelle.getFullYear();
        aujourdhui = annee + '-' + mois + '-' + jour;

        dbHelper.PlantePotager.arrose(x, y, idUser, aujourdhui).then(
            potagers => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(potagers));
            },
            err => {
                next(err);
            },
        );

    });

    app.post('/potager/remove', function (req, res, next) {
        const x = req.body.x; 
        const y = req.body.y;
        const idUser = req.body.idUser;
        dbHelper.PlantePotager.rmPotager(x, y, idUser).then(
            potagers => {
                res.set('Content-type', 'application/json');
                res.send(JSON.stringify(potagers));
            },
            err => {
                next(err);
            },
        );

    });
    return app;
}