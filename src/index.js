// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const { Card, Suggestion } = require('dialogflow-fulfillment');
const admin = require('firebase-admin');
const axios = require('axios');

const token = "";
const config = {
    headers: { Authorization: `Bearer ${token}` }
};


//  Credenciales necesarias para las conexiones con la API

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: "easyfdbot-9ion",
        clientEmail: "firebase-adminsdk-6xpof@easyfdbot-9ion.iam.gserviceaccount.com",
        privateKey: ""
    }),
    databaseURL: "https://easyfdbot-9ion-default-rtdb.firebaseio.com/"
});

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));


    //  Registro de usuarios
    //  Comprueba que el nombre de usuario no exista actualmente en la base de datos

    function guardarUsernameHandler(agent) {
        const userName = agent.parameters.username;
        let userRef = admin.database().ref('/users/');
      
        return userRef.once('value').then((snapshot) => {
            var user = snapshot.child(`${userName}`).val();
          
            if (user != null) {
                agent.add(`Lo siento, ese nombre de usuario ya está registrado en nuestro sistema`);
                agent.add(`Prueba con otro`);
                agent.setContext({"name": "esperando_nombre", "lifespan": 1});
              
            } else {
                agent.add(new Card({ title: `Contraseña`, text: `Ahora introduce una contraseña` }));
                agent.setContext({
                    "name": "esperando_password", "lifespan": 1,
                    "parameters": { "username": userName }
                });
            }
        });

    }

    //  Se guarda el usuario en la BBDD con el alias elegido anteriormente y la contraseña.

    function guardarUserHandler(agent) {
        const context = agent.getContext('esperando_password');
        const userName = context.parameters.username;

        const pass = agent.parameters.password;

        let usersRef = admin.database().ref('/users/');

        agent.add(`Te has registrado correctamente, ${userName}`);
        agent.add(`¿Quieres iniciar sesión?`);
        usersRef.child(userName).set({alias: userName, contraseña: pass});

    }

    //  Iniciar sesion
    //  Primero comprueba que el nombre de usuario exista en la BBDD

    function checkUserHandler(agent) {
        const userName = agent.parameters.username;
        let userRef = admin.database().ref('/users');
      
        return userRef.once('value').then((snapshot) => {
            var user = snapshot.child(`${userName}`).val();
          
            if (user == null) {
                agent.add(`El usuario que has introducido no existe en la base de datos. Inténtalo de nuevo.`);
                agent.setContext({"name": "esperando_usuario", "lifespan": 1});
              
            } else {
                agent.add(`¡Qué alegría tenerte por aquí de nuevo, ${userName}!`);
                agent.add(new Card({title: `Contraseña`, text: `Ahora introduce tu contraseña`}));
                agent.setContext({
                    "name": "esperando_password_login", "lifespan": 1,
                    "parameters": { "username": userName }
                });
            }
        });
    }

    //  Comprobación de que la contraseña que introduce el usuario sea la misma que la que estça guardada.

    function checkPassHandler(agent) {
        const pass = agent.parameters.password;
        const context = agent.getContext('esperando_password_login');
        const userName = context.parameters.username;
        let userRef = admin.database().ref('/users/');

        return userRef.once('value').then((snapshot) => {
            var aux = snapshot.child(`${userName}/contraseña`).val();
          
            if (aux != pass) {
                agent.add(`La contraseña introducida no es correcta. Pruebe de nuevo.`);
                agent.setContext({"name": "esperando_password_login", "lifespan": 1});
              
            } else {
                agent.setContext({"name": "guardar_username", "lifespan": 10, "parameters": {"username": userName}});
                agent.add(`¡Has iniciado sesión correctamente!`);
                agent.add(`¿Qué quieres hacer ahora?\n\n`);

                agent.add(new Suggestion(`Buscar restaurantes`));
                agent.add(new Suggestion(`Ver favoritos`));
                agent.add(new Suggestion(`Nada`));
            }
        });

    }

    function getCityInfo(ciudad) {
        /*
        *   Devuelve una promesa que al resolverse tiene el contenido
        *   del pedido a la API de Yelp.
            Los parámetros de la query indican que e buscarán locales hosteleros, en una ciudad concreta
            y se ordenaran por las valoraciones. 
        */
        return new Promise((resolve, reject) => {
            axios.get(`https://api.yelp.com/v3/businesses/search?term=food&sort_by=rating&locale=es_ES&location=${ciudad}`, config)
                .then((res) => {
                    resolve(res);
                }).catch((res) => {
                    reject(res);
                });
        });
    }

    function consultarInfoHandler(agent) {
        /*
        *	Lista en el agente los restaurantes pertenecientes a una ciudad 
            con los parametros determinados
        */

        // Encabezado del mensaje 
        const ciudad = agent.parameters.city;
        agent.add(`Aquí estan los 10 mejores restaurantes en ${ciudad}`);

        // GetCityInfo devuelve una promesa que al resolverse provee la response
        // con la informacion de los restaurantes 
        return getCityInfo(ciudad).then((res) => {
            const datos = res.data;
          
            // Para cada restaurante se agrega una card con sus datos. 
            // 10 Resultados.
            for (var i = 0; i < 10; i++) {
              
                 const id = datos.businesses[i].id;
                 const nombre = datos.businesses[i].name;

                 const direccion = datos.businesses[i].location.display_address;
                 const dirFormat = [];
              
               
                 for (var j=0; j<direccion.length; j++){
                    dirFormat.push(`${datos.businesses[i].location.display_address[j]}\n`);
                 }
              
                agent.add(new Card({
                        title: nombre, text: `${dirFormat.join('')}`,
                        buttonText: `Más información`, buttonUrl: `El id es ${id}`
                    })
                );
            }
        });

    }

    function getRestauranteInfo(id) {
        /*
        *   Devuelve una promesa que al resolverse tiene el contenido
        *   del pedido a la API de Yelp (Info del restaurante)
        */
        return new Promise((resolve, reject) => {
            axios.get(`https://api.yelp.com/v3/businesses/${id}?locale=es_ES`, config)
                .then((res) => {
                    resolve(res);
                }).catch((res) => {
                    reject(res);
                });
        });
    }

    //  Cuando el usuario accede a la opción de Más Información de un restaurante en concreto

    function consultarMasInfoHandler(agent) {

        const id = agent.parameters.id;
      
        // Si el contexto es nulo, significa que el usuario no ha iniciado sesión y por lo tanto tendrá opciones limitadas 

        const context = agent.getContext('guardar_username');

        return getRestauranteInfo(id).then((res) => {
        
            const datos = res.data;
            agent.add(`Aquí están los resultados para el restaurante ${datos.name}`);

            const image = datos.image_url;
            const direccion = datos.location.address1;
            const precio = datos.price;
            const valoracion = datos.rating;
            const url = datos.url;
            const tipos = [];
          
            for (var i=0; i<datos.categories.length; i++){
                 tipos.push(datos.categories[i].title);
            }
         
          
            if (context == null) {
                agent.setContext({"name": "mostrar_opiniones", "lifespan": 1, "parameters": {"id": id, "nombre": datos.name}});
                agent.add(new Card({
                    title: datos.name, imageUrl: image, text: `Direccion: ${direccion}\nTipo de comida: ${tipos.join(', ')}\nPrecio: ${precio}\nValoración: ${valoracion}/5`,
                    buttonText: `Opiniones`, buttonUrl: `opiniones`
                })
                );

            } else {
                agent.setContext({"name": "mostrar_opiniones", "lifespan": 1, "parameters": {"id": id, "nombre": datos.name}});
                agent.setContext({"name": "guardar_restaurante", "lifespan": 1, "parameters": {"id": id, "nombre": datos.name, "imageUrl": image, "direccion": direccion, "ciudad": datos.location.city, "tipo": tipos.join(', '), "precio": precio, "valoracion": valoracion, "telefono": datos.phone, "url": url}});
                agent.add(new Card({
                    title: datos.name, imageUrl: image, text: `Direccion: ${direccion}\nTipo de comida: ${tipos.join(', ')}\nPrecio: ${precio}\nValoración: ${valoracion}/5\n`
                   
                }));
              
                agent.add(new Suggestion(`Añadir a favoritos`));
                agent.add(new Suggestion(`Información de reserva`));
                agent.add(new Suggestion(`Opiniones`));
                
            }

        });
    }

    //  Guarda los datos del restaurante en la lista de favoritos

    function guardarRestauranteHandler(agent) {
               
        const context = agent.getContext('guardar_restaurante');

        const context1 = agent.getContext('guardar_username');

        const id = context.parameters.id;
      
        const nombre = context.parameters.nombre;
        const imageUrl = context.parameters.imageUrl;
        const direccion = context.parameters.direccion;
        const ciudad = context.parameters.ciudad;
        const tipos = context.parameters.tipo;
        const precio = context.parameters.precio;
        const valoracion = context.parameters.valoracion;
        
        const userName = context1.parameters.username;

        let usersRef = admin.database().ref(`users/${userName}/favoritos/`);

        return usersRef.once('value').then((snapshot) => {
            var restaurante = snapshot.child(`${id}`).val();

            if(restaurante != null){
                agent.add(`¡Vaya! Ya has guardado ese restaurante en tu lista de favoritos`);
                agent.add(`Prueba con otro`);
                
            } else {
                usersRef.child(`${id}`).set({ nombre: nombre, imagen: imageUrl, ciudad: ciudad, direccion: direccion, tipos: tipos, precio: precio, valoracion: valoracion});
                agent.add(`¡Genial!`);
                agent.add(`Se ha añadido correctamente a tu lista de favoritos`);
            }
        });
    }

    //  Consultar los restaurantes guardados en la lista de favoritos 

    function consultarFavoritosHandler(agent) {

        const context = agent.getContext('guardar_username');
        const userName = context.parameters.username;

        //Encabezado de la lista de favoritos
        agent.add(`Aquí tienes tu lista de restaurantes favoritos: `);

        let userRef = admin.database().ref('users/' + userName);

        return userRef.child("favoritos").once('value').then((snapshot) => {
            snapshot.forEach((snapchild) => {
                const child = snapchild.val();

                // La key es el id, ya que los restaurantes se guardan con ese identificador único
                const id = snapchild.key;
                
                const nombre = child.nombre;
                const imagen = child.imagen;
                const ciudad = child.ciudad;
                const direccion = child.direccion;
                const tipos = child.tipos;
                const precio = child.precio;
                const valoracion = child.valoracion;

                agent.add(new Card({title: nombre, imageUrl: imagen, text: `Direccion: ${direccion}\nCiudad: ${ciudad}\nTipo de comida: ${tipos}\nPrecio: ${precio}\nValoración: ${valoracion}/5`,
                buttonText: "Eliminar", buttonUrl: `eliminar el restaurante ${id}` }));

            });
        });
    }

    //  La opción de eliminar un restaurante de la lista de favoritos. 

    function eliminarRestauranteHandler(agent) {
        const id = agent.parameters.id;

        const context = agent.getContext('guardar_username');
        const userName = context.parameters.username;

        let userRef = admin.database().ref(`users/${userName}`);
        userRef.child(`favoritos/${id}`).set(null);

        agent.add(`¡Se ha eliminado el restaurante correctamente!`);
        agent.add(`¿Qué quieres hacer ahora?`);

    }
  
   //  Función auxiliar para obtener las opiniones de la API.

    function getOpiniones(id) {
        /*
        *   Devuelve una promesa que al resolverse tiene el contenido
        *   del pedido a la API de Yelp (Las opiniones sobre un restaurante en español)
        */
        return new Promise((resolve, reject) => {
            axios.get(`https://api.yelp.com/v3/businesses/${id}/reviews?locale=es_ES`, config)
                .then((res) => {
                    resolve(res);
                }).catch((res) => {
                    reject(res);
                });
        });
    }

    //  Función de consultar opiniones.

    function consultarOpinionesHandler(agent) {

        const context = agent.getContext('mostrar_opiniones');
        const id = context.parameters.id;
        const nombre = context.parameters.nombre;
      
        agent.add(`Aquí tienes algunas opiniones sobre ${nombre}`);

        return getOpiniones(id).then((res) => {
            const datos = res.data;
                  
            for (var i = 0; i < datos.reviews.length; i++) {
                const nombre = datos.reviews[i].user.name;
                const fechaHora = datos.reviews[i].time_created;
                const texto = datos.reviews[i].text;
                const valoracion = datos.reviews[i].rating;
              
                agent.add(new Card({
                    title: `Opinión nº ${i+1}` , text: `Usuario: ${nombre}\nValoración: ${valoracion}/5 \n\n${fechaHora}\n\n${texto}`
                })
                );
            } 

        });
    }
  
    function consultarReservaHandler(agent) {
      
        const context = agent.getContext('guardar_restaurante');
        const nombre = context.parameters.nombre;
        const url = context.parameters.url;
        const telefono = context.parameters.telefono;
        agent.add(`Aquí tienes más información sobre cómo realizar una reserva en ${nombre}`);
      
        if(telefono == undefined){
          agent.add(`Accede a la página web en Yelp para obtener más información: ${url}`);
          
        }else{
        agent.add(`Accede a la página web en Yelp para obtener más información: ${url}`);
        agent.add(`También puedes contactar con el restaurante en el teléfono ${telefono}`);
       
        }
    }

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('get Name', guardarUsernameHandler);
    intentMap.set('get Password', guardarUserHandler);
    intentMap.set('login Name', checkUserHandler);
    intentMap.set('login Password', checkPassHandler);
    intentMap.set('get City', consultarInfoHandler);
    intentMap.set('Mas informacion', consultarMasInfoHandler);
    intentMap.set('guardar Restaurante', guardarRestauranteHandler);
    intentMap.set('consultar Favoritos', consultarFavoritosHandler);
    intentMap.set('eliminar Restaurante', eliminarRestauranteHandler);
    intentMap.set('consultar Opiniones', consultarOpinionesHandler);
    intentMap.set('consultar InfoReserva', consultarReservaHandler);

    agent.handleRequest(intentMap);
});
