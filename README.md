# EasyFoodBot: Asistente virtual para la búsqueda de datos hosteleros.

Los avances en los últimos años en los sistemas de inteligencia artificial han concluido en 
desarrollo de asistentes virtuales con el fin de facilitar la comunicación entre las personas y los 
ordenadores en lenguaje natural. 

Hoy en día, hay ciertas tareas que se pueden simplificar y automatizar mediante el uso de 
chatbots, como es el caso de la búsqueda de establecimientos hosteleros en función de un 
criterio específico, que en este caso será la ciudad que el usuario solicite, y la posterior reserva 
de mesa en dicho local. 

Este proyecto se centrará en el desarrollo de un asistente virtual llamado EasyFoodBot, que 
nos permitirá acceder a información sobre los restaurantes que hay en una determinada 
ciudad y nos dará la posibilidad de llevar a cabo una reserva teniendo en cuenta nuestras 
preferencias. 

Para la realización del proyecto, se ha tomado como base la plataforma Dialogflow, una 
herramienta de Google que nos permite crear un bot conversacional al que podremos 
entrenar. Esta plataforma permite la integración con APIs externas, con bases de datos y con 
plataformas de mensajería instantánea. En este caso, la API externa elegida será Yelp Fusion 
API, que nos ofrece la plataforma Yelp a través de una API Key, para obtener información y 
reseñas sobre locales hosteleros por todo el mundo. En caso de necesitar información 
adicional que no nos pueda ofrecer la API, se utilizará el método de Web Scrapping. 
Con respecto al almacenamiento, se utilizarán los servicios de Firebase Realtime Database, 
proporcionada por Google. Por último, la plataforma de mensajería con la que se integrará 
será Telegram. 

Como marco de trabajo, se ha elegido la metodología SCRUM debido a que obtendremos 
versiones del producto final de forma regular con los que recibiremos un feedback por parte 
del cliente, que en este caso será la tutora. Para gestionar el tiempo que se dedica a cada 
tarea, se ha utilizado la herramienta digital Clockify y para el control de tareas se ha empleado 
el tablero de proyectos que nos proporciona GitHub
