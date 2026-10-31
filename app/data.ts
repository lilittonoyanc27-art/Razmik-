export type PracticeItem = {
  question: string;
  questionHy: string;
  answer: string;
  answerHy: string;
  keywords: string[];
};

const raw = `
¿Te gusta jugar al fútbol?|Դու սիրո՞ւմ ես ֆուտբոլ խաղալ։|Sí, me encanta jugar al fútbol.|Այո՛, ես շատ եմ սիրում ֆուտբոլ խաղալ։|sí,encanta,jugar
¿En qué posición juegas?|Ո՞ր դիրքում ես խաղում։|Juego de delantero.|Ես հարձակվող եմ խաղում։|delantero,juego
¿Qué hiciste en el entrenamiento de ayer?|Ի՞նչ արեցիր երեկվա մարզման ժամանակ։|Practiqué pases y tiros a portería.|Ես մարզեցի փոխանցումներն ու հարվածները դարպասին։|practiqué,pases,tiros
¿Tu equipo ganó el último partido?|Քո թիմը հաղթե՞ց վերջին խաղը։|Sí, ganamos por dos a uno.|Այո՛, մենք հաղթեցինք երկու-մեկ հաշվով։|ganamos,dos,uno
¿Quién marcó el gol decisivo?|Ո՞վ խփեց վճռորոշ գոլը։|Nuestro capitán marcó el gol decisivo.|Մեր ավագը խփեց վճռորոշ գոլը։|capitán,marcó
¿Diste una asistencia?|Դու գոլային փոխանցում տվեցի՞ր։|Sí, di una asistencia en la segunda parte.|Այո՛, ես գոլային փոխանցում տվեցի երկրորդ խաղակեսում։|sí,asistencia,segunda
¿Cómo te sentiste después del partido?|Ինչպե՞ս էիր քեզ զգում խաղից հետո։|Me sentí cansado, pero muy feliz.|Ես հոգնած էի, բայց շատ ուրախ։|cansado,feliz
¿Qué te dijo el entrenador?|Ի՞նչ ասաց քեզ մարզիչը։|Me dijo que mantuviera la calma.|Նա ասաց, որ հանգստություն պահպանեմ։|dijo,calma
¿Prefieres marcar goles o dar pases?|Նախընտրո՞ւմ ես գոլ խփել, թե փոխանցում տալ։|Prefiero ayudar al equipo con buenos pases.|Ես նախընտրում եմ օգնել թիմին լավ փոխանցումներով։|prefiero,equipo,pases
¿Qué harías si tu equipo perdiera uno a cero?|Ի՞նչ կանեիր, եթե թիմդ պարտվեր մեկ-զրո։|Seguiría luchando hasta el final.|Ես կշարունակեի պայքարել մինչև վերջ։|seguiría,luchando,final
¿Cómo reaccionas cuando ganas un partido importante?|Ինչպե՞ս ես արձագանքում կարևոր խաղում հաղթելիս։|Celebro con mis compañeros y la afición.|Տոնում եմ թիմակիցներիս և երկրպագուների հետ։|celebro,compañeros,afición
¿Te gustaría jugar en el Real Madrid?|Կցանկանայի՞ր խաղալ «Ռեալ Մադրիդում»։|Sí, sería un sueño para mí.|Այո՛, դա ինձ համար երազանք կլիներ։|sí,sueño
¿Qué haces antes de un partido?|Ի՞նչ ես անում խաղից առաջ։|Caliento, escucho música y me concentro.|Տաքանում եմ, երաժշտություն եմ լսում և կենտրոնանում։|caliento,música,concentro
¿Con quién te gusta jugar más?|Ո՞ւմ հետ ես ամենաշատը սիրում խաղալ։|Me gusta jugar con compañeros que se comunican bien.|Սիրում եմ խաղալ լավ հաղորդակցվող թիմակիցների հետ։|compañeros,comunican
¿Cómo fue el marcador ayer?|Երեկվա հաշիվն ինչպիսի՞ն էր։|El marcador final fue tres a dos.|Վերջնական հաշիվը երեք-երկու էր։|tres,dos,marcador
¿A qué minuto hiciste el pase?|Ո՞ր րոպեին կատարեցիր փոխանցումը։|Hice el pase en el minuto setenta.|Ես փոխանցումը կատարեցի յոթանասուներորդ րոպեին։|minuto,setenta
¿Quién fue el mejor jugador del partido?|Ո՞վ էր խաղի լավագույն ֆուտբոլիստը։|El portero fue el mejor del partido.|Դարպասապահը խաղի լավագույնն էր։|portero,mejor
¿Dónde se jugó el partido?|Որտե՞ղ կայացավ խաղը։|Jugamos en el estadio municipal.|Մենք խաղացինք քաղաքային մարզադաշտում։|estadio,municipal
¿Cuánto duró el calentamiento?|Որքա՞ն տևեց տաքացումը։|El calentamiento duró veinte minutos.|Տաքացումը տևեց քսան րոպե։|veinte,minutos
¿Por qué llegaste tarde al entrenamiento?|Ինչո՞ւ ուշացար մարզումից։|Llegué tarde porque el autobús se retrasó.|Ես ուշացա, որովհետև ավտոբուսը ուշացավ։|autobús,retrasó
¿Qué entrenarás mañana?|Ի՞նչ ես մարզելու վաղը։|Mañana entrenaré la velocidad y el control del balón.|Վաղը մարզելու եմ արագությունն ու գնդակի կառավարումը։|mañana,velocidad,control
¿Quién es el capitán de tu equipo?|Ո՞վ է քո թիմի ավագը։|La capitana es la jugadora número diez.|Ավագը տասը համարի ֆուտբոլիստուհին է։|capitana,diez
¿Qué hace un buen capitán?|Ի՞նչ է անում լավ ավագը։|Un buen capitán anima y escucha al equipo.|Լավ ավագը ոգևորում և լսում է թիմին։|anima,escucha,equipo
¿Cómo apoyaron los aficionados?|Ինչպե՞ս աջակցեցին երկրպագուները։|Cantaron y animaron durante todo el partido.|Նրանք երգեցին և ոգևորեցին ամբողջ խաղի ընթացքում։|cantaron,animaron
¿Viajaste con el equipo?|Դու թիմի հետ ճամփորդեցի՞ր։|Sí, viajamos juntos en autobús.|Այո՛, մենք միասին ավտոբուսով գնացինք։|sí,juntos,autobús
¿Cuál es tu club favorito?|Ո՞րն է քո սիրելի ակումբը։|Mi club favorito es el que juega con valentía.|Իմ սիրելի ակումբն այն է, որը համարձակ է խաղում։|favorito,valentía
¿Quién es tu jugador favorito?|Ո՞վ է քո սիրելի ֆուտբոլիստը։|Mi jugador favorito destaca por su disciplina.|Իմ սիրելի ֆուտբոլիստն առանձնանում է կարգապահությամբ։|favorito,disciplina
¿Qué pasó ayer en el partido?|Ի՞նչ պատահեց երեկվա խաղում։|Remontamos el resultado en los últimos minutos.|Մենք վերջին րոպեներին շրջեցինք խաղի հաշիվը։|remontamos,últimos,minutos
¿Quién dio el pase de gol?|Ո՞վ տվեց գոլային փոխանցումը։|El centrocampista dio el pase de gol.|Կիսապաշտպանը տվեց գոլային փոխանցումը։|centrocampista,pase
¿Cómo jugó la defensa?|Ինչպե՞ս խաղաց պաշտպանությունը։|La defensa estuvo muy organizada.|Պաշտպանությունը շատ կազմակերպված էր։|defensa,organizada
¿El portero paró el penalti?|Դարպասապահը հետ մղե՞ց տասնմեկմետրանոցը։|Sí, lo paró con una gran estirada.|Այո՛, նա հրաշալի ցատկով հետ մղեց այն։|sí,paró,estirada
¿Por qué cambió la táctica el entrenador?|Ինչո՞ւ մարզիչը փոխեց մարտավարությունը։|La cambió para atacar por las bandas.|Նա փոխեց այն եզրերով հարձակվելու համար։|atacar,bandas
¿Qué necesitas mejorar?|Ի՞նչ պետք է բարելավես։|Necesito mejorar mi pierna izquierda.|Ես պետք է բարելավեմ ձախ ոտքս։|mejorar,izquierda
¿Cómo controlas los nervios?|Ինչպե՞ս ես վերահսկում լարվածությունդ։|Respiro hondo y pienso en el primer pase.|Խորը շնչում եմ և մտածում առաջին փոխանցման մասին։|respiro,primer,pase
¿Qué dices al entrar al campo?|Ի՞նչ ես ասում խաղադաշտ մտնելիս։|Digo: vamos a jugar como un equipo.|Ասում եմ՝ եկե՛ք խաղանք որպես թիմ։|vamos,equipo
¿Cómo felicitas a un compañero?|Ինչպե՞ս ես շնորհավորում թիմակցիդ։|Le digo: gran partido, has jugado muy bien.|Ասում եմ՝ հիանալի խաղ, շատ լավ խաղացիր։|gran,partido,bien
¿Qué dices después de perder?|Ի՞նչ ես ասում պարտվելուց հետո։|Debemos aprender y volver más fuertes.|Պետք է սովորենք և վերադառնանք ավելի ուժեղ։|aprender,fuertes
¿Cómo pides el balón?|Ինչպե՞ս ես գնդակը խնդրում։|Grito: ¡aquí, pásamela!|Բղավում եմ՝ այստե՛ղ, փոխանցի՛ր ինձ։|aquí,pásamela
¿Cómo avisas de un rival?|Ինչպե՞ս ես զգուշացնում մրցակցի մասին։|Digo: ¡cuidado, tienes uno detrás!|Ասում եմ՝ զգույշ, հետևումդ մրցակից կա։|cuidado,detrás
¿Qué dices para animar al equipo?|Ի՞նչ ես ասում թիմին ոգևորելու համար։|Digo: ¡juntos podemos remontar!|Ասում եմ՝ միասին կարող ենք շրջել խաղը։|juntos,podemos,remontar
¿Fue limpia la entrada?|Սահանկումը մաքո՞ւր էր։|Sí, tocó el balón primero.|Այո՛, նա առաջինը դիպավ գնդակին։|sí,balón,primero
¿Qué cobró el árbitro?|Ի՞նչ նշանակեց մրցավարը։|El árbitro cobró una falta cerca del área.|Մրցավարը տուգանային նշանակեց տուգանային հրապարակի մոտ։|árbitro,falta,área
¿Había fuera de juego?|Խաղից դուրս վիճակ կա՞ր։|Sí, el delantero estaba adelantado.|Այո՛, հարձակվողը առաջ էր անցել։|sí,delantero,adelantado
¿Cómo fue el primer tiempo?|Ինչպե՞ս անցավ առաջին խաղակեսը։|Fue intenso, pero terminó sin goles.|Այն լարված էր, բայց ավարտվեց առանց գոլերի։|intenso,sin,goles
¿Qué cambió en la segunda parte?|Ի՞նչ փոխվեց երկրորդ խաղակեսում։|Presionamos más arriba y creamos ocasiones.|Մենք ավելի բարձր ճնշեցինք և պահեր ստեղծեցինք։|presionamos,ocasiones
¿Cuántos tiros hiciste?|Քանի՞ հարված կատարեցիր։|Hice tres tiros, dos a portería.|Ես երեք հարված կատարեցի, երկուսը՝ դարպասին։|tres,dos,portería
¿Tuviste una ocasión clara?|Հստակ գոլային պահ ունեցա՞ր։|Sí, pero el portero hizo una gran parada.|Այո՛, բայց դարպասապահը հիանալի սեյվ կատարեց։|sí,portero,parada
¿Cómo celebraste el gol?|Ինչպե՞ս տոնեցիր գոլը։|Corrí hacia la afición y abracé a mis compañeros.|Ես վազեցի երկրպագուների մոտ և գրկեցի թիմակիցներիս։|afición,abracé,compañeros
¿Qué bebida tomas en el descanso?|Ի՞նչ ես խմում ընդմիջման ժամանակ։|Tomo agua para mantenerme hidratado.|Ջուր եմ խմում, որպեսզի պահպանեմ ջրային հավասարակշռությունը։|agua,hidratado
¿Qué comiste antes del partido?|Ի՞նչ կերար խաղից առաջ։|Comí algo ligero con suficiente energía.|Թեթև, բայց էներգիա տվող սնունդ կերա։|ligero,energía
¿Cuándo es el próximo partido?|Ե՞րբ է հաջորդ խաղը։|El próximo partido es el sábado por la tarde.|Հաջորդ խաղը շաբաթ օրը կեսօրից հետո է։|sábado,tarde
¿Contra quién jugáis?|Ո՞ւմ դեմ եք խաղում։|Jugamos contra el líder de la liga.|Մենք խաղում ենք առաջնության առաջատարի դեմ։|líder,liga
¿Cuál es el objetivo de la temporada?|Ո՞րն է մրցաշրջանի նպատակը։|Queremos clasificarnos para la final.|Մենք ցանկանում ենք դուրս գալ եզրափակիչ։|clasificarnos,final
¿Cómo describes a tu equipo?|Ինչպե՞ս կբնութագրես թիմդ։|Somos un equipo unido, rápido y valiente.|Մենք միասնական, արագ և համարձակ թիմ ենք։|unido,rápido,valiente
¿Qué cualidad debe tener un delantero?|Ի՞նչ հատկություն պետք է ունենա հարձակվողը։|Debe moverse bien y definir con calma.|Նա պետք է լավ տեղաշարժվի և հանգիստ ավարտի գրոհը։|moverse,definir,calma
¿Qué cualidad debe tener un defensa?|Ի՞նչ հատկություն պետք է ունենա պաշտպանը։|Debe anticiparse y comunicarse con el portero.|Նա պետք է կանխատեսի և խոսի դարպասապահի հետ։|anticiparse,portero
¿Qué hace un centrocampista?|Ի՞նչ է անում կիսապաշտպանը։|Conecta la defensa con el ataque.|Նա կապում է պաշտպանությունը հարձակման հետ։|conecta,defensa,ataque
¿Qué hace el portero al sacar?|Ի՞նչ է անում դարպասապահը խաղարկման ժամանակ։|Busca a un compañero libre y pasa con precisión.|Նա գտնում է ազատ թիմակցին և ճշգրիտ փոխանցում։|compañero,pasa,precisión
¿Aceptarías una invitación a entrenar?|Կընդունեի՞ր մարզվելու հրավերը։|Claro, me encantaría entrenar con vosotros.|Իհարկե, հաճույքով կմարզվեի ձեզ հետ։|claro,encantaría,entrenar
¿Qué responderías a un elogio del entrenador?|Ի՞նչ կպատասխանեիր մարզչի գովեստին։|Gracias, seguiré trabajando para mejorar.|Շնորհակալություն, կշարունակեմ աշխատել՝ բարելավվելու համար։|gracias,trabajando,mejorar
`;

export const practiceBank: PracticeItem[] = raw
  .trim()
  .split("\n")
  .map((line) => {
    const [question, questionHy, answer, answerHy, keywords] = line.split("|");
    return {
      question,
      questionHy,
      answer,
      answerHy,
      keywords: keywords.split(","),
    };
  });

export const funnyDistractors = [
  "El balón pidió un bocadillo.",
  "Dormimos durante todo el partido.",
  "El árbitro marcó un gol con la cabeza.",
  "Fuimos al estadio para estudiar matemáticas.",
  "Nadie vio el balón porque era invisible.",
  "El entrenador jugó con ocho porteros.",
  "Ganamos sin salir del vestuario.",
  "La afición condujo el autobús por el campo.",
];
