/* eslint-env browser */
/* global Mustache, page */
'use strict';

// Le script principal de notre application single page
// Celui-ci effectue le routing coté client (et d'autres choses)

// Notre objet contexte, qui contiendra toutes les données
// pour les templates Mustache
let context = { 'logged': false, 'user': 0, 'previous': 0, 'button': 0, 'nbTache': 0 };
let dataPlante = [];
let plantes = [];
let potagers = [];
let taillePotager = { 'x': 4, 'y': 5 };

// fonction utilitaire permettant de faire du 
// lazy loading (chargement à la demande) des templates
const templates = (() => {
    let templates = {};
    return function load(url) {
        if (templates[url]) {
            return Promise.resolve(templates[url]);
        }
        else {
            return fetch(url)
                .then(res => res.text())
                .then(text => {
                    return templates[url] = text;
                })
        }
    }
})();

// Fonction utilitaire qui permet de charger en parallèle les 
// différents "partial" (morceaux de template. Ex: header)
const loadPartials = (() => {
    let partials;

    return async function loadPartials() {
        if (!partials) {
            partials = {
                header: templates('public/templates/header.mustache'),
                footer: templates('public/templates/footer.mustache'),
            };
            const promises = Object.entries(partials)
                .map(async function ([k, v]) {
                    return [k, await v];
                });
            partials = Object.fromEntries(await Promise.all(promises));
        }
        return partials;
    }
})();

async function loadTaches(type) {
    const ulToDo = document.getElementById('toDo').querySelector('ul');
    try {
        let result;
        if (type == "main") {
            result = await fetch('http://127.0.0.1:80/api/tachesComplete/' + context.user.id);
        } else if (type == "visit") {
            result = await fetch('http://127.0.0.1:80/api/taches/' + context.user.visit);
        } else if (type == "potager") {
            result = await fetch('http://127.0.0.1:80/api/taches/' + context.user.id);
        }
        const taches = await result.json();
        let li;
        let ulListe = [];
        for (var i = 0; i < taches.length; i++) {
            li = document.createElement('li');
            const form = document.createElement('form');
            li.appendChild(form);
            let input = document.createElement('input');
            input.type = "checkbox";
            input.name = "toDo" + i;
            input.value = "Je m'assigne cette tâche";
            input.idTache = taches[i].id;
            input.etat = taches[i].etat;
            if (input.etat == 1) {
                input.checked = true;
            }

            input.addEventListener('click', async (event) => {
                if (event.target.etat == 1) {
                    event.target.etat = 0;
                } else {
                    event.target.etat = 1;
                }
                try {
                    await fetch('api/taches/changeEtat', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                        },
                        body: 'id=' + event.target.idTache + '&etat=' + event.target.etat
                    });
                } catch (e) {
                    console.log(e);
                }
            })

            const ulDescription = document.createElement('ul');
            ulDescription.className = "desc";

            const liDescription1 = document.createElement('li');
            liDescription1.className = "desc";
            const labelDescription = document.createElement('label');
            labelDescription.className = "nomTache";
            labelDescription.innerHTML = taches[i].titre;
            liDescription1.appendChild(labelDescription);

            const liDescription2 = document.createElement('li');
            liDescription2.className = "desc";
            const labelDescription2 = document.createElement('label');
            labelDescription2.className = "description";
            labelDescription2.innerHTML = taches[i].notes;

            liDescription2.appendChild(labelDescription2);

            ulDescription.appendChild(liDescription1);
            ulDescription.appendChild(liDescription2);

            const date = document.createElement('label');
            date.className = "date";
            const date2 = new Date(taches[i].date);
            date.innerHTML = date2.toLocaleDateString();

            let bouton = document.createElement('input');
            bouton.type = "button";
            bouton.name = "assignation";
            bouton.value = "Je m'assigne cette tâche";
            bouton.idTache = taches[i].id;
            bouton.previousRealisateur = taches[i].idRealisateur;

            let users;
            await fetch('http://127.0.0.1:80/api/user/liste')
                .then(response => response.json())
                .then(data => {
                    users = data;
                })
                .catch(err => console.error(err));

            if (bouton.previousRealisateur == context.user.id) {
                bouton.className = "assigné";
                bouton.checked = true;
                bouton.value = "Assigné";
                bouton.previousRealisateur = '-1';
            } else if (bouton.previousRealisateur != -1 && bouton.previousRealisateur != null) {
                bouton.className = "dejaassigne";
                bouton.disabled = true;
                bouton.value = users.find(user => user.id == bouton.previousRealisateur).prenom + ' ' + users.find(user => user.id == bouton.previousRealisateur).nom;
            } else {
                bouton.className = "nonassigné";
                bouton.checked = false;
                bouton.value = "Je m'assigne cette tâche";
            }

            bouton.addEventListener('click', async (event) => {
                try {
                    if (!bouton.checked) {
                        await fetch('api/taches/changeRealisateur', {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                            },
                            body: 'id=' + event.target.idTache + '&realisateur=' + context.user.id
                        });
                    } else {
                        await fetch('api/taches/changeRealisateur', {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                            },
                            body: 'id=' + event.target.idTache + '&realisateur=' + event.target.previousRealisateur
                        });
                    }
                } catch (e) {
                    console.log(e);
                }
            })

            let deleteButton;
            if (type == "potager") {
                deleteButton = document.createElement('input');
                deleteButton.type = "button";
                deleteButton.name = "suppression";
                deleteButton.value = "Supprimer";
                deleteButton.idTache = taches[i].id;

                deleteButton.addEventListener('click', async (event) => {
                    try {
                        await fetch('api/taches/remove', {
                            method: 'POST',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                            },
                            body: 'id=' + event.target.idTache
                        });

                        form.style.display = "none";

                        context.nbTache--;

                        if (context.nbTache == 0) {
                            const p = document.createElement('p');
                            p.innerHTML = "Aucune tâche pour le moment";
                            document.getElementById('toDo').querySelector('ul').appendChild(document.createElement('li').appendChild(p));
                        }
                    } catch (e) {
                        console.log(e);
                    }


                })
            }

            form.appendChild(input);
            form.appendChild(ulDescription);
            form.appendChild(date);
            form.appendChild(bouton);
            if (type == "potager") {
                form.appendChild(deleteButton);
            }

            li.appendChild(form);
            li.checked = bouton.checked;

            ulListe.push(li);
        }

        for (i = 0; i < ulListe.length; i++) {
            if (ulListe[i].checked) {
                ulToDo.appendChild(ulListe[i]);
            }
        }

        for (i = 0; i < ulListe.length; i++) {
            if (!ulListe[i].checked) {
                ulToDo.appendChild(ulListe[i]);
            }
        }

        if (ulListe.length == 0) {
            ulToDo.innerHTML = "";
            const p = document.createElement('p');
            p.innerHTML = "Aucune tâche pour le moment";
            ulToDo.appendChild(document.createElement('li').appendChild(p));
        } else {
            context.nbTache = ulListe.length;
        }

        var boutonsAssignation = document.querySelectorAll("#toDo input[name='assignation']");
        boutonsAssignation.forEach(function (bouton) {
            bouton.addEventListener('click', function () {
                if (!this.checked) {
                    this.style.backgroundColor = "rgb(223, 219, 172)";
                    this.checked = true;
                    this.value = "Assigné";
                } else {
                    this.checked = false;
                    this.style.backgroundColor = "#e9e9ed";
                    this.value = "Je m'assigne cette tâche";
                }
            });
        });
    } catch (error) {
        console.log(error);
    }
}

page('main', async function () {
    if (!context.logged) {
        page('/');
    }
    else {
        context.previous = 'main';
        await renderTemplate(templates('private/main/main.mustache'));
        // eslint-disable-next-line no-inner-declarations
        async function getMeteo() {
            await fetch('https://api.open-meteo.com/v1/forecast?latitude=47.22&longitude=-1.55&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,windspeed_10m,uv_index,terrestrial_radiation&current_weather=true&forecast_days=1&timezone=Europe%2FBerlin')
                .then(response => response.json())
                .then(data => {
                    const uv = document.getElementById('uv');
                    const temp = document.getElementById('temperature');
                    const ozone = document.getElementById('ozone');
                    const vent = document.getElementById('vent');
                    const humidite = document.getElementById('humidite');
                    const pluie = document.getElementById('pluie');

                    const hour = new Date().getHours();

                    temp.innerHTML = data.current_weather.temperature + data.hourly_units.temperature_2m;
                    vent.innerHTML = data.current_weather.windspeed + data.hourly_units.windspeed_10m;

                    uv.innerHTML = data.hourly.uv_index[hour] + data.hourly_units.uv_index;
                    ozone.innerHTML = data.hourly.terrestrial_radiation[hour] + data.hourly_units.terrestrial_radiation;
                    humidite.innerHTML = data.hourly.relativehumidity_2m[hour] + data.hourly_units.relativehumidity_2m;
                    pluie.innerHTML = data.hourly.precipitation_probability[hour] + data.hourly_units.precipitation_probability;
                })
                .catch(err => console.error(err));
        }

        getMeteo();

        const buttonReload = document.getElementById('reload');
        buttonReload.addEventListener('click', () => {
            getMeteo();
        }
        );

        loadTaches("main");

        const boutonPotager = document.getElementById('potager');
        boutonPotager.addEventListener('click', () => {
            page('/monpotager');
        }
        );

        const autrePotager = document.getElementById('autrePotager');
        autrePotager.addEventListener('click', () => {
            page('/autrePotager');
        }
        );

        const boutonAgenda = document.getElementById('agenda');
        boutonAgenda.addEventListener('click', () => {
            page('/agenda');
        }
        );

        const boutonDeconnexion = document.getElementById('deconnexion');
        boutonDeconnexion.addEventListener('click', () => {
            context.logged = false;
            context.user = 0;
            page('/');
        }
        );

        const nomUser = document.getElementById('nomUser');
        nomUser.innerHTML = context.user.nom + " " + context.user.prenom;

        const roleUser = document.getElementById('roleUser');
        roleUser.innerHTML = "Role : " + context.user.role;

        const departUser = document.getElementById('departUser');
        departUser.innerHTML = "Département : " + context.user.departement;

        let users;
        await fetch('http://127.0.0.1:80/api/user/liste')
            .then(response => response.json())
            .then(data => {
                users = data;
            })
            .catch(err => console.error(err));

        const user = users.find(user => user.id == context.user.id);

        const etatPotager = document.getElementById('etatPotager');

        if (user.etat == "0") {
            etatPotager.innerHTML = "Bon état <img src='private/monPotager/images/etatPotager/bon.png' alt='bon état' id='imgEtatPotager'>";
        } else if (user.etat == "1") {
            etatPotager.innerHTML = "Mauvais état <img src='private/monPotager/images/etatPotager/mauvais.png' alt='mauvais état' id='imgEtatPotager'>";
        } else if (user.etat == "2") {
            etatPotager.innerHTML = "A arroser <img src='private/monPotager/images/etatPotager/arroser.png' alt='arroser' id='imgEtatPotager'>";
        } else {
            etatPotager.innerHTML = "Travaux <img src='private/monPotager/images/etatPotager/travaux.png' alt='travaux' id='imgEtatPotager'>";
        }
    }
});

page('monpotager', async function () {
    if (!context.logged) {
        page('/');
    }
    else {
        context.previous = 'monpotager';
        await renderTemplate(templates('private/monpotager/monpotager.mustache'));


        const boutonRetour = document.getElementById('retour');
        boutonRetour.addEventListener('click', () => {
            page('/main');
        }
        );

        const boutonAjoutTache = document.getElementById('ajouttache');
        boutonAjoutTache.addEventListener('click', () => {
            page('/ajouttache');
        }
        );

        loadTaches("potager");

        const tablePotager = document.getElementById('potager').querySelector('tbody');


        for (var i = 0; i < taillePotager.x; i++) {
            let trPotager = document.createElement('tr');
            for (var y = 0; y < taillePotager.y; y++) {
                let tdPotager = document.createElement('td');
                let button = document.createElement('button');
                button.type = 'button';
                button.name = 'button';
                button.className = 'buttonType';
                let img = document.createElement('img');
                img.src = "private/monPotager/images/type/ajouter.png";
                img.alt = 'type Plante';
                button.appendChild(img);
                tdPotager.appendChild(button);
                trPotager.appendChild(tdPotager);
            }
            tablePotager.appendChild(trPotager);
        }

        const boutonsAjout = document.getElementsByClassName("buttonType");
        let j = 0;
        let result;
        let potager;
        let plante;
        let etatArroser = 0;
        for (i = 0; i < boutonsAjout.length; i++) {
            if (i % taillePotager.y == 0 && i != 0) {
                j++;
            }
            boutonsAjout[i].id = j + "" + i % taillePotager.y;

            try {
                result = await fetch('http://127.0.0.1:80/api/potager/byXandYandUser/' + j + '/' + i % taillePotager.y + '/' + context.user.id);
                potager = await result.json();

                if (potager != null) {
                    result = await fetch('http://127.0.0.1:80/api/planteData/' + potager.idPlanteData);
                    plante = await result.json();
                    plantes.push(plante);
                    potagers.push(potager);
                    boutonsAjout[i].numero = plantes.length - 1;
                    let icone = "private/monPotager/images/type/" + plante.img + ".png";
                    boutonsAjout[i].querySelector('img').src = icone;

                    let dateObjet = new Date(potager.date_dernier_arrosage);
                    dateObjet.setDate(dateObjet.getDate() + Number(plante.intervalle_arrosage));

                    const aujourdhui = new Date();



                    if (dateObjet.getTime() < aujourdhui.getTime()) {
                        boutonsAjout[i].querySelector('img').style.border = "3px solid red";
                        boutonsAjout[i].statut = 'nok';
                        etatArroser++;
                        if (i == 0) {
                            const p = document.getElementById('checkArrosé');
                            p.innerHTML = 'A arroser ! <img src="private/monPotager/images/nok.png" alt="nok">';
                        }
                    } else {
                        boutonsAjout[i].statut = 'ok';
                    }

                    boutonsAjout[i].addEventListener('click', function (e) {
                        context.button = this.id;
                        e.target.style.border = "3px solid rgb(47 148 47)";

                        if (context.lastButton != null) {
                            if (context.lastButton.statut == 'ok') {
                                context.lastButton.style.border = "2px solid rgb(70, 192, 70)";
                            } else {
                                context.lastButton.style.border = "2px solid red";
                            }
                        }

                        context.lastButton = this.querySelector('img');
                        context.lastButton.statut = this.statut;

                        if (this.statut == 'nok') {
                            const p = document.getElementById('checkArrosé');
                            p.innerHTML = 'A arroser ! <img src="private/monPotager/images/nok.png" alt="nok">';
                            e.target.style.border = "4px solid red";
                        } else {
                            const p = document.getElementById('checkArrosé');
                            p.innerHTML = 'Arrosé ! <img src="private/monPotager/images/ok.png" alt="nok">';
                            e.target.style.border = "4px solid rgb(47 148 47)";
                        }


                        const titre = document.getElementById('infoTitre');
                        const infoDernArrosage = document.getElementById('infoDernArrosage');
                        infoDernArrosage.style.display = "block";
                        const infoProchArrosage = document.getElementById('infoProchArrosage');
                        infoProchArrosage.style.display = "block";
                        const infoIntervalle = document.getElementById('infoIntervalle');
                        infoIntervalle.style.display = "block";
                        const infoEngrais = document.getElementById('infoEngrais');
                        infoEngrais.style.display = "block";
                        const infoConseil = document.getElementById('infoConseil');
                        infoConseil.style.display = "block";
                        const arroser = document.getElementById('arroser');
                        arroser.style.display = "block";
                        const supprimer = document.getElementById('supprimer');
                        supprimer.style.display = "block";

                        titre.innerHTML = plantes[this.numero].nom;
                        let date = potagers[this.numero].date_dernier_arrosage.split('-');
                        let annee = date[0];
                        let mois = date[1];
                        let jour = date[2];
                        let nouvelleDateChaine = 'Date du dernier arrossage : ' + jour + '/' + mois + '/' + annee;
                        infoDernArrosage.innerHTML = nouvelleDateChaine;
                        let dateObjet = new Date(potagers[this.numero].date_dernier_arrosage);
                        dateObjet.setDate(dateObjet.getDate() + Number(plantes[this.numero].intervalle_arrosage));

                        jour = String(dateObjet.getDate()).padStart(2, '0');
                        mois = String(dateObjet.getMonth() + 1).padStart(2, '0');
                        annee = String(dateObjet.getFullYear());

                        nouvelleDateChaine = 'Date du prochain arrossage : ' + jour + '/' + mois + '/' + annee;
                        infoProchArrosage.innerHTML = nouvelleDateChaine;

                        infoIntervalle.innerHTML = "Intervalle d'arrossage : " + plantes[this.numero].intervalle_arrosage + ' jours';
                        infoEngrais.innerHTML = "Engrais conseillé : " + plantes[this.numero].engrais_conseille;
                        infoConseil.innerHTML = "Conseil : " + plantes[this.numero].conseils;
                    });
                } else {
                    boutonsAjout[i].addEventListener('click', function () {
                        context.button = this.id;
                        page('/ajoutplante');
                    });
                }
            } catch (error) {
                console.log(error);
            }
        }

        if (plantes.length > 0) {
            const titre = document.getElementById('infoTitre');
            const checkArrosé = document.getElementById('checkArrosé');
            const infoDernArrosage = document.getElementById('infoDernArrosage');
            const infoProchArrosage = document.getElementById('infoProchArrosage');
            const infoIntervalle = document.getElementById('infoIntervalle');
            const infoEngrais = document.getElementById('infoEngrais');
            const infoConseil = document.getElementById('infoConseil');
            const arroser = document.getElementById('arroser');
            const suppression = document.getElementById('supprimer');

            titre.innerHTML = "Aucune plante sélectionnée";
            checkArrosé.innerHTML = "Sélectionnez une plante pour voir ses informations";
            infoDernArrosage.style.display = "none";
            infoProchArrosage.style.display = "none";
            infoIntervalle.style.display = "none";
            infoEngrais.style.display = "none";
            infoConseil.style.display = "none";
            arroser.style.display = "none";
            suppression.style.display = "none";
        } else {
            const titre = document.getElementById('infoTitre');
            const checkArrosé = document.getElementById('checkArrosé');
            const infoDernArrosage = document.getElementById('infoDernArrosage');
            const infoProchArrosage = document.getElementById('infoProchArrosage');
            const infoIntervalle = document.getElementById('infoIntervalle');
            const infoEngrais = document.getElementById('infoEngrais');
            const infoConseil = document.getElementById('infoConseil');
            const arroser = document.getElementById('arroser');
            const suppression = document.getElementById('supprimer');

            titre.innerHTML = "Aucune plante";
            checkArrosé.innerHTML = "Ajouter une plante en cliquant sur le bouton + à droite";
            infoDernArrosage.style.display = "none";
            infoProchArrosage.style.display = "none";
            infoIntervalle.style.display = "none";
            infoEngrais.style.display = "none";
            infoConseil.style.display = "none";
            arroser.style.display = "none";
            suppression.style.display = "none";
        }

        const notification = document.getElementById('notification');
        const boutonArroser = document.getElementById('arroser');

        boutonArroser.addEventListener('click', async () => {
            notification.style.opacity = "1";

            try {
                result = await fetch('api/potager/arrose', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                    },
                    body: 'x=' + context.button[0] + '&y=' + context.button[1] + '&idUser=' + context.user.id
                });


                if (result.status == 200) {
                    const infoDernArrosage = document.getElementById('infoDernArrosage');
                    const infoProchArrosage = document.getElementById('infoProchArrosage');
                    const infoIntervalle = document.getElementById('infoIntervalle');

                    const intervalle_arrosage = Number(infoIntervalle.innerHTML.split(' ')[3]);

                    const dateActuelle = new Date();
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

                    let date = jour + '/' + mois + '/' + dateActuelle.getFullYear();
                    infoDernArrosage.innerHTML = 'Date du dernier arrossage : ' + date;
                    date = dateActuelle.getFullYear() + '-' + mois + '-' + jour;
                    let dateObjet = new Date(date);
                    dateObjet.setDate(dateObjet.getDate() + intervalle_arrosage);

                    jour = String(dateObjet.getDate()).padStart(2, '0');
                    mois = String(dateObjet.getMonth() + 1).padStart(2, '0');
                    let annee = String(dateObjet.getFullYear());

                    let nouvelleDateChaine = 'Date du prochain arrossage : ' + jour + '/' + mois + '/' + annee;
                    infoProchArrosage.innerHTML = nouvelleDateChaine;

                    potagers.find(potager => potager.x == context.button[0] && potager.y == context.button[1]).date_dernier_arrosage = date;

                    if (context.lastButton.statut == 'nok') {
                        const p = document.getElementById('checkArrosé');
                        p.innerHTML = 'Arrosé ! <img src="private/monPotager/images/ok.png" alt="nok">';
                        context.lastButton.style.border = '4px solid rgb(70, 192, 70)';
                        context.lastButton.statut = 'ok';
                        document.getElementById(context.button).statut = 'ok';
                        etatArroser--;
                        if (etatArroser == 0) {
                            let etatSelect = document.getElementById('etat');
                            const imgEtat = document.getElementById('imgEtat');
                            etatSelect.value = "0";
                            const etat = etatSelect.value;
                            if (etat == "0") {
                                imgEtat.src = "private/monPotager/images/etatPotager/bon.png";
                            } else if (etat == "1") {
                                imgEtat.src = "private/monPotager/images/etatPotager/mauvais.png";
                            } else if (etat == "2") {
                                imgEtat.src = "private/monPotager/images/etatPotager/arroser.png";
                            } else {
                                imgEtat.src = "private/monPotager/images/etatPotager/travaux.png";
                            }
                        }
                    } else {
                        console.log("Erreur : " + result.status);
                    }
                }

            } catch (error) {
                console.log(error);
            }
            setTimeout(function () {
                notification.style.opacity = "0";
            }, 3000);
        });

        let etatSelect = document.getElementById('etat');
        const imgEtat = document.getElementById('imgEtat');

        if (etatArroser) {
            etatSelect.value = 2;
            try {
                await fetch('api/user/changeEtat', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                    },
                    body: 'id=' + context.user.id + '&etat=' + 2
                });
            } catch (e) {
                console.log(e);
            }

        } else {
            if (context.user.etat == 2) {
                try {
                    await fetch('api/user/changeEtat', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                        },
                        body: 'id=' + context.user.id + '&etat=' + 0
                    });
                    context.user.etat = 0;
                    etatSelect.value = 0;
                } catch (e) {
                    console.log(e);
                }
            } else {
                etatSelect.value = context.user.etat;
            }
        }

        const etat = etatSelect.value;
        if (etat == "0") {
            imgEtat.src = "private/monPotager/images/etatPotager/bon.png";
        } else if (etat == "1") {
            imgEtat.src = "private/monPotager/images/etatPotager/mauvais.png";
        } else if (etat == "2") {
            imgEtat.src = "private/monPotager/images/etatPotager/arroser.png";
        } else {
            imgEtat.src = "private/monPotager/images/etatPotager/travaux.png";
        }

        etatSelect.addEventListener('change', async (event) => {
            const etat = event.target.value;
            context.user.etat = etat;
            if (etat == "0") {
                imgEtat.src = "private/monPotager/images/etatPotager/bon.png";
            } else if (etat == "1") {
                imgEtat.src = "private/monPotager/images/etatPotager/mauvais.png";
            } else if (etat == "2") {
                imgEtat.src = "private/monPotager/images/etatPotager/arroser.png";
            } else {
                imgEtat.src = "private/monPotager/images/etatPotager/travaux.png";
            }

            try {
                await fetch('api/user/changeEtat', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                    },
                    body: 'id=' + context.user.id + '&etat=' + event.target.value
                });
            } catch (e) {
                console.log(e);
            }
        });

        const btnSupprimer = document.getElementById('supprimer');
        btnSupprimer.addEventListener('click', async () => {
            try {
                await fetch('api/potager/remove', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                    },
                    body: 'idUser=' + context.user.id + '&x=' + context.button[0] + '&y=' + context.button[1]
                });

                const btn = document.getElementById(context.button);
                btn.querySelector('img').src = 'private/monPotager/images/type/ajouter.png';
                btn.querySelector('img').style.border = '2px solid rgb(70, 192, 70)';
                btn.addEventListener('click', async (event) => {
                    context.button = event.target.id;
                    page('/ajoutplante');
                }
                );

                const titre = document.getElementById('infoTitre');
                const checkArrosé = document.getElementById('checkArrosé');
                const infoDernArrosage = document.getElementById('infoDernArrosage');
                const infoProchArrosage = document.getElementById('infoProchArrosage');
                const infoIntervalle = document.getElementById('infoIntervalle');
                const infoEngrais = document.getElementById('infoEngrais');
                const infoConseil = document.getElementById('infoConseil');
                const arroser = document.getElementById('arroser');
                const supprimer = document.getElementById('supprimer');

                titre.innerHTML = "Aucune plante sélectionné";
                checkArrosé.innerHTML = "Sélectionnez une plante pour voir ses informations";
                infoDernArrosage.style.display = "none";
                infoProchArrosage.style.display = "none";
                infoIntervalle.style.display = "none";
                infoEngrais.style.display = "none";
                infoConseil.style.display = "none";
                arroser.style.display = "none";
                supprimer.style.display = "none";

            } catch (e) {
                console.log(e);
            }
        }
        );
    }
});

page('autrePotager', async function () {
    if (!context.logged) {
        page('/');
    }
    else {
        context.previous = 'autrePotager';
        await renderTemplate(templates('private/autrePotager/autrePotager.mustache'));
        let userVisit;
        try {
            const response = await fetch('http://127.0.0.1:80/api/user/liste');
            if (response.ok) {
                const result = await response.json();
                const selectProprietaire = document.getElementById('proprietaire');
                for (var i = 0; i < result.length; i++) {
                    if (result[i].id != context.user.id) {
                        const option = document.createElement('option');
                        option.value = result[i].id;
                        option.innerHTML = result[i].nom + ' ' + result[i].prenom;
                        selectProprietaire.appendChild(option);
                    }
                }

                context.user.visit = Number(selectProprietaire.value);
                userVisit = result.find(user => user.id == context.user.visit);

                selectProprietaire.addEventListener('change', async (event) => {
                    context.user.visit = Number(event.target.value);
                    const titrePotager = document.getElementById('titrePotager');
                    titrePotager.innerHTML = 'Potager de ' + selectProprietaire[selectProprietaire.selectedIndex].text + '<img src="private/monPotager/images/uwu.png" alt="uwu">';
                    newPotager();
                });

                const titrePotager = document.getElementById('titrePotager');
                titrePotager.innerHTML = 'Potager de ' + selectProprietaire[selectProprietaire.selectedIndex].text + '<img src="private/monPotager/images/uwu.png" alt="uwu">';

                newPotager();
            }
        } catch (error) {
            console.log(error);
        }

        // eslint-disable-next-line no-inner-declarations
        async function newPotager() {
            const boutonRetour = document.getElementById('retour');
            boutonRetour.addEventListener('click', () => {
                page('/main');
            }
            );

            loadTaches("visit");

            const tablePotager = document.getElementById('potager').querySelector('tbody');
            tablePotager.innerHTML = "";


            for (var i = 0; i < taillePotager.x; i++) {
                let trPotager = document.createElement('tr');
                for (var y = 0; y < taillePotager.y; y++) {
                    let tdPotager = document.createElement('td');
                    let button = document.createElement('button');
                    button.type = 'button';
                    button.name = 'button';
                    button.className = 'buttonType';
                    let img = document.createElement('img');
                    img.src = "private/monPotager/images/type/vide.webp";
                    img.alt = 'type Plante';
                    button.appendChild(img);
                    tdPotager.appendChild(button);
                    trPotager.appendChild(tdPotager);
                }
                tablePotager.appendChild(trPotager);
            }

            const boutonsAjout = document.getElementsByClassName("buttonType");
            let j = 0;
            let result;
            let potager;
            let plante;
            let etatArroser = 0;
            for (i = 0; i < boutonsAjout.length; i++) {
                if (i % taillePotager.y == 0 && i != 0) {
                    j++;
                }
                boutonsAjout[i].id = j + "" + i % taillePotager.y;

                try {
                    result = await fetch('http://127.0.0.1:80/api/potager/byXandYandUser/' + j + '/' + i % taillePotager.y + '/' + context.user.visit);
                    potager = await result.json();

                    if (potager != null) {
                        result = await fetch('http://127.0.0.1:80/api/planteData/' + potager.idPlanteData);
                        plante = await result.json();
                        plantes.push(plante);
                        potagers.push(potager);
                        boutonsAjout[i].numero = plantes.length - 1;
                        let icone = "private/monPotager/images/type/" + plante.img + ".png";
                        boutonsAjout[i].querySelector('img').src = icone;

                        let dateObjet = new Date(potager.date_dernier_arrosage);
                        dateObjet.setDate(dateObjet.getDate() + Number(plante.intervalle_arrosage));

                        const aujourdhui = new Date();



                        if (dateObjet.getTime() < aujourdhui.getTime()) {
                            boutonsAjout[i].querySelector('img').style.border = "3px solid red";
                            boutonsAjout[i].statut = 'nok';
                            etatArroser++;
                            if (i == 0) {
                                const p = document.getElementById('checkArrosé');
                                p.innerHTML = 'A arroser ! <img src="private/monPotager/images/nok.png" alt="nok">';
                            }
                        } else {
                            boutonsAjout[i].statut = 'ok';
                        }

                        boutonsAjout[i].addEventListener('click', function (e) {
                            context.button = this.id;
                            e.target.style.border = "3px solid rgb(47 148 47)";

                            if (context.lastButton != null) {
                                if (context.lastButton.statut == 'ok') {
                                    context.lastButton.style.border = "2px solid rgb(70, 192, 70)";
                                } else {
                                    context.lastButton.style.border = "2px solid red";
                                }
                            }

                            context.lastButton = this.querySelector('img');
                            context.lastButton.statut = this.statut;

                            if (this.statut == 'nok') {
                                const p = document.getElementById('checkArrosé');
                                p.innerHTML = 'A arroser ! <img src="private/monPotager/images/nok.png" alt="nok">';
                                e.target.style.border = "4px solid red";
                            } else {
                                const p = document.getElementById('checkArrosé');
                                p.innerHTML = 'Arrosé ! <img src="private/monPotager/images/ok.png" alt="nok">';
                                e.target.style.border = "4px solid rgb(47 148 47)";
                            }


                            const titre = document.getElementById('infoTitre');
                            const infoDernArrosage = document.getElementById('infoDernArrosage');
                            infoDernArrosage.style.display = "flex";
                            const infoProchArrosage = document.getElementById('infoProchArrosage');
                            infoProchArrosage.style.display = "flex";
                            const infoIntervalle = document.getElementById('infoIntervalle');
                            infoIntervalle.style.display = "flex";
                            const infoEngrais = document.getElementById('infoEngrais');
                            infoEngrais.style.display = "flex";
                            const infoConseil = document.getElementById('infoConseil');
                            infoConseil.style.display = "flex";
                            const arroser = document.getElementById('arroser');
                            arroser.style.display = "flex";

                            titre.innerHTML = plantes[this.numero].nom;
                            let date = potagers[this.numero].date_dernier_arrosage.split('-');
                            let annee = date[0];
                            let mois = date[1];
                            let jour = date[2];
                            let nouvelleDateChaine = 'Date du dernier arrossage : ' + jour + '/' + mois + '/' + annee;
                            infoDernArrosage.innerHTML = nouvelleDateChaine;
                            let dateObjet = new Date(potagers[this.numero].date_dernier_arrosage);
                            dateObjet.setDate(dateObjet.getDate() + Number(plantes[this.numero].intervalle_arrosage));

                            jour = String(dateObjet.getDate()).padStart(2, '0');
                            mois = String(dateObjet.getMonth() + 1).padStart(2, '0');
                            annee = String(dateObjet.getFullYear());

                            nouvelleDateChaine = 'Date du prochain arrossage : ' + jour + '/' + mois + '/' + annee;
                            infoProchArrosage.innerHTML = nouvelleDateChaine;

                            infoIntervalle.innerHTML = "Intervalle d'arrossage : " + plantes[this.numero].intervalle_arrosage + ' jours';
                            infoEngrais.innerHTML = "Engrais conseillé : " + plantes[this.numero].engrais_conseille;
                            infoConseil.innerHTML = "Conseil : " + plantes[this.numero].conseils;
                        });
                    }
                } catch (error) {
                    console.log(error);
                }
            }

            if (plantes.length > 0) {
                const titre = document.getElementById('infoTitre');
                const checkArrosé = document.getElementById('checkArrosé');
                const infoDernArrosage = document.getElementById('infoDernArrosage');
                const infoProchArrosage = document.getElementById('infoProchArrosage');
                const infoIntervalle = document.getElementById('infoIntervalle');
                const infoEngrais = document.getElementById('infoEngrais');
                const infoConseil = document.getElementById('infoConseil');
                const arroser = document.getElementById('arroser');

                titre.innerHTML = "Aucune plante sélectionnée";
                checkArrosé.innerHTML = "Sélectionnez une plante pour voir ses informations";
                infoDernArrosage.style.display = "none";
                infoProchArrosage.style.display = "none";
                infoIntervalle.style.display = "none";
                infoEngrais.style.display = "none";
                infoConseil.style.display = "none";
                arroser.style.display = "none";
            } else {
                const titre = document.getElementById('infoTitre');
                const checkArrosé = document.getElementById('checkArrosé');
                const infoDernArrosage = document.getElementById('infoDernArrosage');
                const infoProchArrosage = document.getElementById('infoProchArrosage');
                const infoIntervalle = document.getElementById('infoIntervalle');
                const infoEngrais = document.getElementById('infoEngrais');
                const infoConseil = document.getElementById('infoConseil');
                const arroser = document.getElementById('arroser');

                titre.innerHTML = "Aucune plante";
                checkArrosé.innerHTML = "Ajouter une plante en cliquant sur le bouton + à droite";
                infoDernArrosage.style.display = "none";
                infoProchArrosage.style.display = "none";
                infoIntervalle.style.display = "none";
                infoEngrais.style.display = "none";
                infoConseil.style.display = "none";
                arroser.style.display = "none";
            }

            const notification = document.getElementById('notification');
            const boutonArroser = document.getElementById('arroser');

            boutonArroser.addEventListener('click', async () => {
                notification.style.opacity = "1";

                try {
                    result = await fetch('api/potager/arrose', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                        },
                        body: 'x=' + context.button[0] + '&y=' + context.button[1] + '&idUser=' + context.user.visit
                    });


                    if (result.status == 200) {
                        const infoDernArrosage = document.getElementById('infoDernArrosage');
                        const infoProchArrosage = document.getElementById('infoProchArrosage');
                        const infoIntervalle = document.getElementById('infoIntervalle');

                        const intervalle_arrosage = Number(infoIntervalle.innerHTML.split(' ')[3]);

                        const dateActuelle = new Date();
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

                        let date = jour + '/' + mois + '/' + dateActuelle.getFullYear();
                        infoDernArrosage.innerHTML = 'Date du dernier arrossage : ' + date;
                        date = dateActuelle.getFullYear() + '-' + mois + '-' + jour;
                        let dateObjet = new Date(date);
                        dateObjet.setDate(dateObjet.getDate() + intervalle_arrosage);

                        jour = String(dateObjet.getDate()).padStart(2, '0');
                        mois = String(dateObjet.getMonth() + 1).padStart(2, '0');
                        let annee = String(dateObjet.getFullYear());

                        let nouvelleDateChaine = 'Date du prochain arrossage : ' + jour + '/' + mois + '/' + annee;
                        infoProchArrosage.innerHTML = nouvelleDateChaine;

                        potagers.find(potager => potager.x == context.button[0] && potager.y == context.button[1]).date_dernier_arrosage = date;

                        if (context.lastButton.statut == 'nok') {
                            const p = document.getElementById('checkArrosé');
                            p.innerHTML = 'Arrosé ! <img src="private/monPotager/images/ok.png" alt="nok">';
                            context.lastButton.style.border = '4px solid rgb(70, 192, 70)';
                            context.lastButton.statut = 'ok';
                            document.getElementById(context.button).statut = 'ok';
                            etatArroser--;
                            if (etatArroser == 0) {
                                const imgEtat = document.getElementById('imgEtat');
                                const labelEtat = document.getElementById('etat');
                                if (userVisit.etat == "2") {
                                    imgEtat.src = "private/monPotager/images/etatPotager/bon.png";
                                    labelEtat.innerHTML = "État : Bon état &#128522;";
                                }
                            }
                        } else {
                            console.log("Erreur : " + result.status);
                        }
                    }

                } catch (error) {
                    console.log(error);
                }
                setTimeout(function () {
                    notification.style.opacity = "0";
                }, 3000);
            });
            const imgEtat = document.getElementById('imgEtat');
            const labelEtat = document.getElementById('etat');

            const etat = userVisit.etat;
            if (etat == "0") {
                imgEtat.src = "private/monPotager/images/etatPotager/bon.png";
                labelEtat.innerHTML = "État : Bon état &#128522;";
            } else if (etat == "1") {
                imgEtat.src = "private/monPotager/images/etatPotager/mauvais.png";
                labelEtat.innerHTML = "État : Mauvais état &#128532;";
            } else if (etat == "2") {
                imgEtat.src = "private/monPotager/images/etatPotager/arroser.png";
                labelEtat.innerHTML = "État : À arroser &#128167;";
            } else {
                imgEtat.src = "private/monPotager/images/etatPotager/travaux.png";
                labelEtat.innerHTML = "État : En travaux &#x1F6A7;";
            }
        }
    }
}
)

page('agenda', async function () {
    if (!context.logged) {
        page('/');
    }
    else {
        context.previous = 'agenda';

        // Renvoie true si la date est dans la semaine courante
        // eslint-disable-next-line no-inner-declarations
        function isDateInCurrentWeek(date) {
            const currentDate = new Date(); // Obtient la date courante
            const firstDayOfWeek = currentDate.getDate() - currentDate.getDay() + (currentDate.getDay() === 0 ? -6 : 1); // Obtient le premier jour de la semaine courante (lundi)

            const startOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), firstDayOfWeek);
            const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000); // Ajoute 6 jours à la date de début de la semaine

            // Vérifie si la date donnée est comprise entre la date de début et de fin de la semaine courante
            return date >= startOfWeek && date <= endOfWeek;
        }

        // Affiche la popup de détails d'une tâche
        // eslint-disable-next-line no-inner-declarations
        function showTaskDetails(task) {
            closeTaskDetails();
            const popup = document.createElement('div');
            popup.setAttribute('class', 'popupTache');


            // Nom de la tâche
            const popupTaskName = document.createElement('h2');
            popupTaskName.textContent = task.titre;
            popupTaskName.setAttribute('class', 'h2');

            // Date de la tâche
            const popupTaskDate = document.createElement('p');
            popupTaskDate.textContent = 'Date : ' + task.date;

            // Créateur de la tâche
            const popupTaskCreator = document.createElement('p');
            fetch('http://127.0.0.1:80/api/user/liste/' + task.idCreateur)
                .then(response => {
                    response.json().then(users => {
                        const userCreator = users[0];
                        popupTaskCreator.textContent = 'Créée par : ' + userCreator.nom + ' ' + userCreator.prenom;
                    });
                })
                .catch(() => {
                    popupTaskCreator.textContent = 'Créée par : inconnu';
                });

            // Personne à qui la tâche est assignée
            const popupTaskAssignee = document.createElement('p');
            if (task.idRealisateur === -1) {
                popupTaskAssignee.textContent = 'Non assignée';
            }
            else {
                fetch('http://127.0.0.1:80/api/user/liste/' + task.idRealisateur)
                    .then(response => {
                        response.json().then(users => {
                            const userAssignee = users[0];
                            popupTaskAssignee.textContent = 'Assigné à : ' + userAssignee.nom + ' ' + userAssignee.prenom;
                        });
                    })
                    .catch(() => {
                        popupTaskAssignee.textContent = 'Assigné à : inconnu';
                    });
            }

            // Description de la tâche
            const popupTaskDescription = document.createElement('p');
            if (task.description === undefined || task.description === null || task.description === '') {
                popupTaskDescription.textContent = 'Pas de description';
            }
            else {
                popupTaskDescription.textContent = 'Description : ' + task.description;
            }

            // Bouton de fermeture de la popup
            const popupCloseButton = document.createElement('button');
            popupCloseButton.textContent = 'Fermer';
            popupCloseButton.setAttribute('class', 'btn btn-primary');
            popupCloseButton.addEventListener('click', () => closeTaskDetails());


            // Ajout à l'élément parent
            popup.appendChild(popupTaskName);
            popup.appendChild(popupTaskDate);
            popup.appendChild(popupTaskCreator);
            popup.appendChild(popupTaskAssignee);
            popup.appendChild(popupTaskDescription);
            popup.appendChild(popupCloseButton);

            document.body.appendChild(popup);


            // Positionnement de la popup
            const html = document.querySelector('html');
            popup.style.left = `${html.clientWidth / 2 - popup.clientWidth / 2}px`;
        }

        // eslint-disable-next-line no-inner-declarations
        function closeTaskDetails() {
            const popup = document.querySelector('.popupTache');
            if (popup !== null)
                popup.parentNode.removeChild(popup);
        }

        await renderTemplate(templates('private/agenda/agenda.mustache'));

        // Construction du calendrier
        const calendar = document.getElementById('calendar');
        const daysOfWeek = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        const headerRow = document.createElement('tr');

        // Construction des colonnes (jours)
        const tableHeader = document.createElement('thead');

        for (var i = 0; i < daysOfWeek.length; i++) {
            const headerCell = document.createElement('th');
            headerCell.textContent = daysOfWeek[i];
            headerRow.appendChild(headerCell);
        }

        tableHeader.appendChild(headerRow);

        const table = document.createElement('table');
        table.appendChild(tableHeader);
        table.setAttribute('class', 'table table-striped-columns');

        // Création de la ligne
        const tableBody = document.createElement('tbody');

        // Ligne de la table
        const newRow = document.createElement('tr');

        // Label de la ligne
        const labelRow = document.createElement('th');
        labelRow.setAttribute('scope', 'row');
        const labelRowText = document.createTextNode('Tâches');
        labelRow.appendChild(labelRowText);
        newRow.appendChild(labelRow);

        // Créneaux de chaque ligne
        for (var j = 1; j < daysOfWeek.length; j++) {
            const time_slot = document.createElement('td');
            time_slot.setAttribute('id', 'jour' + j.toString());

            const ulist = document.createElement('ul');
            time_slot.appendChild(ulist);

            newRow.appendChild(time_slot);
        }

        tableBody.appendChild(newRow);

        table.appendChild(tableBody);

        calendar.appendChild(table);

        const boutonNewTask = document.getElementById('newTask');
        boutonNewTask.addEventListener('click', () => {
            page('/ajouttache');
        });

        // Récupération des tâches de l'api
        try {
            fetch('http://127.0.0.1:80/api/taches/' + context.user.id)
                .then(response => {
                    response.json()
                        .then(tasks => {
                            // Ajout des tâches liées à un utilisateur dans la page
                            for (let task of tasks) {
                                const taskDate = new Date(task.date);
                                if (isDateInCurrentWeek(taskDate)) {
                                    const taskCell = document.querySelector(`html body main #calendar table tbody tr #jour${taskDate.getDay()} ul`);
                                    const taskLabel = document.createTextNode(task.titre);
                                    const taskLink = document.createElement('a');
                                    taskLink.setAttribute('class', 'task');
                                    taskLink.addEventListener('click', () => showTaskDetails(task));

                                    // Couleur de fond de la tâche : vert foncé si elle nous est assigné, sinon vert clair
                                    if (task.idRealisateur === context.user.id) {
                                        taskLink.style.backgroundColor = '#0fa80f';
                                    }
                                    else {
                                        taskLink.style.backgroundColor = 'lightgreen';
                                    }
                                    taskLink.appendChild(taskLabel);
                                    taskCell.appendChild(taskLink);
                                }
                            }
                        });
                });
        }
        catch (error) {
            console.log('Impossible de charger les tâches : ' + error);
        }
    }
});

page('ajouttache', async function () {
    if (!context.logged) {
        page('/');
    }
    else {
        await renderTemplate(templates('private/ajoutTache/ajouttache.mustache'));
        var buttonAssignation = document.getElementById("assignation");
        buttonAssignation.checked = false;

        buttonAssignation.addEventListener("click", function () {
            if (buttonAssignation.checked) {
                buttonAssignation.value = "Personne pour le moment";
                buttonAssignation.style.backgroundColor = "#f44336";
                buttonAssignation.checked = false;
            } else {
                buttonAssignation.value = "Assigné à moi";
                buttonAssignation.style.backgroundColor = "#4CAF50";
                buttonAssignation.checked = true;
            }
        });

        var date = document.getElementById("date");
        date.value = new Date().toISOString().slice(0, 10);

        var buttonAnnuler = document.getElementById("annulé");
        buttonAnnuler.addEventListener("click", function () {
            if (context.previous == "main") {
                page('/main');
            } else if (context.previous == "monpotager") {
                page('/monpotager');
            } else if (context.previous == "agenda") {
                page('/agenda');
            }
        }
        );

        var buttonValider = document.getElementById("validé");
        buttonValider.addEventListener("click", async function () {
            var titre = document.getElementById("titre").value;
            var description = document.getElementById("note").value;
            var date = document.getElementById("date").value;
            if (titre != '' && date != '') {
                let assignation;
                if (document.getElementById("assignation").checked) {
                    assignation = context.user.id;
                } else {
                    assignation = -1;
                }

                try {
                    // On fait ensuite un fetch sur l'api pour s'authentifier
                    await fetch('api/taches/add', {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                        },
                        method: 'POST',
                        body: 'idCreateur=' + encodeURIComponent(context.user.id) + '&idRealisateur=' + encodeURIComponent(assignation) + '&titre=' + encodeURIComponent(titre) + '&date=' + encodeURIComponent(date) + '&notes=' + encodeURIComponent(description),
                    });
                    if (context.previous == "main") {
                        page('/main');
                    } else if (context.previous == "monpotager") {
                        page('/monpotager');
                    } else if (context.previous == "agenda") {
                        page('/agenda');
                    }
                }
                catch (e) {
                    console.error(e);
                    if (context.previous == "main") {
                        page('/main');
                    } else if (context.previous == "monpotager") {
                        page('/monpotager');
                    } else if (context.previous == "agenda") {
                        page('/agenda');
                    }
                    return;
                }
            }

        }
        );

        const formTache = document.getElementById('formTache');
        formTache.addEventListener('submit', async (e) => {
            e.preventDefault();
        }
        );
    }
});

page('ajoutplante', async function () {
    if (!context.logged) {
        page('/');
    }
    else {
        await renderTemplate(templates('private/ajoutPlante/ajoutPlante.mustache'));
        const formPlante = document.getElementById('formPlante');
        formPlante.addEventListener('submit', async (e) => {
            e.preventDefault();
        }
        );
        const boutonRetour = document.getElementById('annulé');
        boutonRetour.addEventListener('click', () => {
            page('/monPotager');
        }
        );

        const selectIcone = document.getElementById('icone');
        const imageIcone = document.getElementById('imageIcone');
        selectIcone.addEventListener('change', () => {
            imageIcone.src = "private/monPotager/images/type/" + selectIcone.selectedIndex + ".png";
        }
        );

        const datePlantation = document.getElementById('datePlantation');
        datePlantation.value = new Date().toISOString().slice(0, 10);
        const dateRecolte = document.getElementById('dateRecolte');
        dateRecolte.value = new Date().toISOString().slice(0, 10);

        const selectPlante = document.getElementById('plante');
        try {
            const result = await fetch('api/planteData');
            dataPlante = await result.json();

            for (var i = 0; i < dataPlante.length; i++) {
                var option = document.createElement('option');
                option.value = dataPlante[i].id;
                option.textContent = dataPlante[i].nom;
                selectPlante.appendChild(option);
            }

            if (!dataPlante.length) {
                document.getElementById('selectionPlante').style.opacity = 0;
                document.getElementById('selectionPlante').style.position = 'absolute';
                document.getElementById('selectionPlante').style.pointerEvents = 'none';
                document.getElementById('selectionPlante').style.height = 0;
                document.getElementById('selectionPlante').style.width = 0;
            } else {
                selectPlante.addEventListener('change', () => {
                    if (selectPlante.selectedIndex == 0) {
                        document.getElementById('nom').value = "";
                        document.getElementById('nom').disabled = false;
                        selectIcone.getElementsByTagName("option")[0].selected = 'selected';
                        selectIcone.disabled = false;
                        imageIcone.src = "private/monPotager/images/type/" + selectIcone.selectedIndex + ".png";
                        document.getElementById('intervalleArrosage').value = "";
                        document.getElementById('intervalleArrosage').disabled = false;
                        document.getElementById('engrais').value = "";
                        document.getElementById('engrais').disabled = false;
                        document.getElementById('commentaire').value = "";
                        document.getElementById('commentaire').disabled = false;
                    }
                    else {
                        document.getElementById('nom').value = dataPlante[selectPlante.selectedIndex - 1].nom;
                        document.getElementById('nom').disabled = true;
                        selectIcone.getElementsByTagName("option")[Number(dataPlante[selectPlante.selectedIndex - 1].img)].selected = 'selected';
                        selectIcone.disabled = true;
                        imageIcone.src = "private/monPotager/images/type/" + selectIcone.selectedIndex + ".png";
                        document.getElementById('intervalleArrosage').value = Number(dataPlante[selectPlante.selectedIndex - 1].intervalle_arrosage);
                        document.getElementById('intervalleArrosage').disabled = true;
                        document.getElementById('engrais').value = dataPlante[selectPlante.selectedIndex - 1].engrais_conseille;
                        document.getElementById('engrais').disabled = true;
                        document.getElementById('commentaire').value = dataPlante[selectPlante.selectedIndex - 1].conseils;
                        document.getElementById('commentaire').disabled = true;
                    }
                });
            }
        }
        catch (e) {
            console.error(e);
            return;
        }

        document.getElementById('validé').addEventListener('click', async () => {
            const x = Number(context.button[0]);
            const y = Number(context.button[1]);



            if (selectPlante.selectedIndex) {
                try {
                    await fetch('api/potager/add', {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                        },
                        method: 'POST',
                        body: 'idUser=' + encodeURIComponent(context.user.id) + '&idPlante=' + encodeURIComponent(selectPlante.value) + '&x=' + encodeURIComponent(x) + '&y=' + encodeURIComponent(y) + '&date_recolte=' + encodeURIComponent(document.getElementById('dateRecolte').value) + "&date_dernier_arrosage=" + encodeURIComponent(document.getElementById('datePlantation').value),
                    });

                    page('/monpotager');
                }
                catch (e) {
                    console.error(e);
                    return;
                }
            } else {
                if (dataPlante.find(plante => plante.nom === document.getElementById('nom').value) === undefined) {
                    if (document.getElementById('nom').value != "" && document.getElementById('intervalleArrosage').value != "" && document.getElementById('datePlantation').value != "" && document.getElementById('dateRecolte').value != "") {
                        try {
                            await fetch('api/planteData/add', {
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                                },
                                method: 'POST',
                                body: 'nom=' + encodeURIComponent(document.getElementById('nom').value) + '&intervalle_arrosage=' + encodeURIComponent(document.getElementById('intervalleArrosage').value) + '&engrais_conseille=' + encodeURIComponent(document.getElementById('engrais').value) + '&conseils=' + encodeURIComponent(document.getElementById('commentaire').value) + '&img=' + encodeURIComponent(selectIcone.selectedIndex),
                            });

                            const result = await fetch('api/planteData/nom/' + encodeURIComponent(document.getElementById('nom').value));
                            const data = await result.json();

                            await fetch('api/potager/add', {
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                                },
                                method: 'POST',
                                body: 'idUser=' + encodeURIComponent(context.user.id) + '&idPlante=' + encodeURIComponent(data.id) + '&x=' + encodeURIComponent(x) + '&y=' + encodeURIComponent(y) + '&date_recolte=' + encodeURIComponent(document.getElementById('dateRecolte').value) + "&date_dernier_arrosage=" + encodeURIComponent(document.getElementById('datePlantation').value),
                            });

                            page('/monpotager');
                        }
                        catch (e) {
                            console.error(e);
                            return;
                        }
                    }
                } else {
                    alert('La plante existe déjà');
                    selectPlante.getElementsByTagName("option")[dataPlante.indexOf(document.getElementById('nom').value) + 2].selected = 'selected';
                    document.getElementById('nom').value = dataPlante[selectPlante.selectedIndex - 1].nom;
                    document.getElementById('nom').disabled = true;
                    document.getElementById('intervalleArrosage').value = dataPlante[selectPlante.selectedIndex - 1].intervalle_arrosage;
                    document.getElementById('intervalleArrosage').disabled = true;
                    document.getElementById('engrais').value = dataPlante[selectPlante.selectedIndex - 1].engrais_conseille;
                    document.getElementById('engrais').disabled = true;
                    document.getElementById('commentaire').value = dataPlante[selectPlante.selectedIndex - 1].conseils;
                    document.getElementById('commentaire').disabled = true;
                }
            }
        });
    }
});

page('register', async function () {
    await renderTemplate(templates('public/templates/register.mustache'), context);
    const boutonBack = document.getElementById('annulé');
    boutonBack.addEventListener('click', () => {
        page('/');
    }
    );

    const formRegister = document.getElementById('formRegister');
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
    }
    );
    const boutonRegister = document.getElementById('validé');
    boutonRegister.addEventListener('click', async () => {
        const nom = document.getElementById('nom').value;
        const prenom = document.getElementById('prenom').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const password2 = document.getElementById('password2').value;
        const departement = document.getElementById('departement').value;
        const langue = document.getElementById('langue').value;
        const role = document.getElementById('role').value;

        if (nom == "" || prenom == "" || email == "" || password == "" || password2 == "" || role == "" || departement == "") {
            const notificationRegister = document.getElementById('notificationRegister');
            notificationRegister.style.top = window.scrollY + 20 + "px";
            notificationRegister.innerHTML = 'Il manque des informations<img src="public/images/mauvais.png" alt="erreur">'
            notificationRegister.style.opacity = 1;
            setTimeout(function () {
                notificationRegister.style.opacity = "0";
            }, 3000);
        } else if (password != password2) {
            const notificationRegister = document.getElementById('notificationRegister');
            notificationRegister.style.top = window.scrollY + 20 + "px";
            notificationRegister.innerHTML = 'Les mots de passe de correspondent pas<img src="public/images/mauvais.png" alt="erreur">'
            notificationRegister.style.opacity = 1;
            setTimeout(function () {
                notificationRegister.style.opacity = "0";
            }, 3000);
        } else {
            try {
                // On fait ensuite un fetch sur l'api pour s'authentifier
                await fetch('api/user/add', {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                    },
                    method: 'POST',
                    body: 'nom=' + encodeURIComponent(nom) + '&prenom=' + encodeURIComponent(prenom) + '&email=' + encodeURIComponent(email) + '&password=' + encodeURIComponent(password) + '&departement=' + encodeURIComponent(departement) + '&langue=' + encodeURIComponent(langue) + '&role=' + encodeURIComponent(role),
                });

                context.previous = 'register';

                page('/');
            }
            catch (e) {
                console.error(e);
                page('/');
                return;
            }
        }
    }
    );
});

// Route pour la page principale (index.html)
page('/', async function () {
    // pas besoin de faire de await sur cet appel puisqu'il n'y a pas d'autre 
    // traitement ensuite
    renderLoginPage(context);

    // fonction interne d'affichage de la page 
    async function renderLoginPage(context) {
        // On rend le template
        await renderTemplate(templates('public/templates/index.mustache'), context);
        const notificationAccueil = document.querySelector('#notificationAccueil');
        notificationAccueil.style.opacity = "0";
        if (context.erreur) {
            notificationAccueil.innerHTML = context.erreur + '<img src="public/images/mauvais.png" alt="erreur">';
            notificationAccueil.style.opacity = "1";
            setTimeout(function () {
                notificationAccueil.style.opacity = "0";
            }, 3000);
            context.erreur = '';
        }

        if (context.previous == 'register') {
            notificationAccueil.innerHTML = 'Votre compte a bien été créé ! <img src="public/images/bon.png" alt="bon">';
            notificationAccueil.style.borderColor = "green";
            notificationAccueil.style.width = "280px";
            notificationAccueil.style.opacity = "1";
            setTimeout(function () {
                notificationAccueil.style.opacity = "0";
                notificationAccueil.style.borderColor = "red";
                notificationAccueil.style.width = "250px";
            }, 3000);
            context.previous = '';
        }

        const login_btn = document.querySelector('#login-btn');
        login_btn.addEventListener('click', loadMain);
        document.querySelector('#identifiant').addEventListener('keypress', (event) => {
            if (event.keyCode === 13) {
                loadMain();
            }
        });
        document.querySelector('#password').addEventListener('keypress', (event) => {
            if (event.keyCode === 13) {
                loadMain();
            }
        });

        document.querySelector('#register-btn').addEventListener('click', () => {
            page('/register');
        });

        async function loadMain() {
            // Récupération du login et du mot de passe
            const username = document.querySelector('input[placeholder="Identifiant"]').value;
            const password = document.querySelector('input[placeholder="Mot de passe"]').value;
            let result;
            try {
                // On fait ensuite un fetch sur l'api pour s'authentifier
                result = await fetch('api/login', {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                    },
                    method: 'POST',
                    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
                });
            }
            catch (e) {
                console.error(e);
                return;
            }
            try {
                if (result.ok) {
                    // Si tout s'est bien passé
                    result = await result.json();
                    // Et que l'authentification s'est bien passée
                    if (result.success) {
                        // on passe à la page d'administration
                        context.logged = true;
                        var user = await fetch('api/login/' + username + '/' + password);
                        user = await user.json();
                        context.user = {
                            id: user.id,
                            nom: user.nom,
                            prenom: user.prenom,
                            departement: user.departement,
                            role: user.role,
                            etat: user.etat,
                        };
                        context.erreur = false;
                        page('/main');
                    }
                    else {
                        // Sinon on réaffiche la page avec quelques infos pour expliquer ce qui n'a pas marché
                        context.erreur = result.message;
                        renderLoginPage(context);
                    }
                }
            }
            catch (e) {
                console.error(e);
                return;
            }
        }
    }
});

// On démarre le routing
page.base('/'); // psi votre projet n'est pas hébergé à la racine de votre serveur, ajuster son url de base ici !
page.start();

// fonction utilitaire de rendu d'un template
async function renderTemplate(template, context) {
    // On charge les partials (si pas déà chargés)
    const partials = await loadPartials();
    // On rend le template
    const rendered = Mustache.render(await template, context, partials);
    // Et on l'insère dans le body
    let body = document.querySelector('body');
    body.innerHTML = rendered;
}
