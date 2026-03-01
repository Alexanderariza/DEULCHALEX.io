// ============================================================
// CONFIGURACIÓN DE SUPABASE
// ============================================================
const supabaseUrl = 'https://kcfiacdwufadnuknkfkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjZmlhY2R3dWZhZG51a25rZmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTA5MTksImV4cCI6MjA4Nzc2NjkxOX0.bmz4K7E-a2PCM5CObDYz9ritbTKLi_OpwyiNBMOH5fU';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Usuario fijo (mientras no haya autenticación)
const USER_ID = '00000000-0000-0000-0000-000000000000';

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let mostrandoSoloFavoritas = false;
let palabrasFiltradas = [];
let vocabularioData = null;
let userProgress = [];
let userPersonalWords = [];
let temaActual = null;
let palabrasActuales = [];
let modoTest = false;
let preguntasTest = [];
let preguntaActual = 0;
let respuestasCorrectas = 0;
let puntuacion = 0;
let estadisticas = {
    palabrasAprendidas: 0,
    pruebasCompletadas: 0,
    puntosTotales: 0,
    palabrasPorTema: {}
};

// ============================================================
// ELEMENTOS DEL DOM (con comprobación de existencia)
// ============================================================
function getElement(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Elemento con id "${id}" no encontrado`);
    return el;
}

// Generales
const themesContainer = getElement('themesContainer');
const vocabularyList = getElement('vocabularyList');
const learningSection = getElement('learningSection');
const testSection = getElement('testSection');
const currentThemeName = getElement('currentThemeName');
const startTestBtn = getElement('startTestBtn');
const backToLearningBtn = getElement('backToLearningBtn');
const progressBar = getElement('progressBar');
const wordsLearned = getElement('wordsLearned');
const totalWords = getElement('totalWords');
const footerWordsLearned = getElement('footerWordsLearned');
const footerTestsCompleted = getElement('footerTestsCompleted');
const footerTotalPoints = getElement('footerTotalPoints');

// Elementos del test
const currentQuestion = getElement('currentQuestion');
const correctAnswers = getElement('correctAnswers');
const score = getElement('score');
const testProgress = getElement('testProgress');
const progressPercent = getElement('progressPercent');
const questionType = getElement('questionType');
const questionText = getElement('questionText');
const questionWord = getElement('questionWord');
const toggleHintBtn = getElement('toggleHintBtn');
const hintContent = getElement('hintContent');
const hintText = getElement('hintText');
const answerInput = getElement('answerInput');
const checkAnswerBtn = getElement('checkAnswerBtn');
const articleButtons = document.querySelectorAll('.article-btn');
const feedback = getElement('feedback');
const feedbackTitle = getElement('feedbackTitle');
const feedbackText = getElement('feedbackText');
const correctAnswerDisplay = getElement('correctAnswerDisplay');
const nextQuestionBtn = getElement('nextQuestionBtn');
const testCompletion = getElement('testCompletion');
const finalScore = getElement('finalScore');
const finalCorrect = getElement('finalCorrect');
const finalPercentage = getElement('finalPercentage');
const completionMessage = getElement('completionMessage');
const restartTestBtn = getElement('restartTestBtn');
const newTestBtn = getElement('newTestBtn');

// Elementos de palabras personales
const personalWordsList = getElement('personalWordsList');

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
    await cargarDatosIniciales();
    configurarEventListeners();
    setTimeout(() => {
        if (themesContainer && themesContainer.children.length > 0) {
            themesContainer.children[0].click();
        }
    }, 100);
    cargarPalabrasPersonales();
});

// ============================================================
// FUNCIONES DE CARGA DE DATOS
// ============================================================
async function cargarDatosIniciales() {
    const { data: vocab, error: vocabError } = await supabaseClient
        .from('vocabulary')
        .select('*')
        .order('id');

    if (vocabError) {
        console.error('Error cargando vocabulario:', vocabError);
        mostrarError('No se pudo cargar el vocabulario. Verifica la conexión con Supabase.');
        return;
    }

    const temasMap = {};
    vocab.forEach(p => {
        if (!temasMap[p.category]) {
            temasMap[p.category] = {
                id: p.category,
                nombre: obtenerNombreTema(p.category),
                icono: obtenerIconoTema(p.category),
                descripcion: obtenerDescripcionTema(p.category),
                palabras: []
            };
        }
        temasMap[p.category].palabras.push(p);
    });

    vocabularioData = {
        temas: Object.values(temasMap),
        estadisticas: {
            totalPalabras: vocab.length,
            temasTotales: Object.keys(temasMap).length
        }
    };

    if (totalWords) totalWords.textContent = vocabularioData.estadisticas.totalPalabras;

    await cargarProgresoUsuario();
    actualizarEstadisticasGlobales();
    mostrarTemas();
    actualizarBarraProgreso();
    actualizarFooter();
}

async function cargarProgresoUsuario() {
    const { data, error } = await supabaseClient
        .from('user_vocabulary')
        .select('*')
        .eq('user_id', USER_ID);

    if (error) {
        console.error('Error cargando progreso:', error);
        userProgress = [];
    } else {
        userProgress = data;
    }
}

async function cargarPalabrasPersonales() {
    const { data, error } = await supabaseClient
        .from('user_words')
        .select('*')
        .eq('user_id', USER_ID)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error cargando palabras personales:', error);
        userPersonalWords = [];
    } else {
        userPersonalWords = data;
        mostrarPalabrasPersonales();
    }
}

// ============================================================
// MAPEO DE TEMAS (NOMBRES, ICONOS, DESCRIPCIONES)
// ============================================================
function obtenerNombreTema(category) {
    const map = {
        familia: 'Familia y Relaciones',
        caracter: 'Carácter y Sentimientos',
        salud: 'Salud y Cuerpo',
        trabajo: 'Trabajo y Profesiones',
        viajes: 'Viajes y Transporte',
        vida_diaria: 'Vida Diaria',
        comida: 'Comida y Bebida',
        deporte: 'Deporte y Fitness',
        educacion: 'Educación y Formación',
        compras: 'Compras y Tiendas',
        sentimientos: 'Sentimientos y Emociones',
        naturaleza: 'Naturaleza y Medio Ambiente',
        tecnologia: 'Tecnología',
        politica: 'Política y Sociedad',
        comunicacion: 'Comunicación',
        ropa: 'Ropa y Moda',
        clima: 'Clima y Tiempo',
        ocio: 'Ocio y Tiempo Libre',
        animales: 'Animales',
        ciudad: 'Ciudad y Urbanismo'
    };
    return map[category] || category;
}

function obtenerIconoTema(category) {
    const map = {
        familia: '👨‍👩‍👧‍👦',
        caracter: '😊',
        salud: '🏥',
        trabajo: '💼',
        viajes: '✈️',
        vida_diaria: '🏠',
        comida: '🍲',
        deporte: '⚽',
        educacion: '📚',
        compras: '🛒',
        sentimientos: '❤️',
        naturaleza: '🌿',
        tecnologia: '💻',
        politica: '🏛️',
        comunicacion: '💬',
        ropa: '👗',
        clima: '☀️',
        ocio: '🎨',
        animales: '🐶',
        ciudad: '🏙️'
    };
    return map[category] || '📌';
}

function obtenerDescripcionTema(category) {
    const map = {
        familia: 'Vocabulario esencial sobre familia y relaciones personales',
        caracter: 'Adjetivos para describir personalidad y emociones',
        salud: 'Términos médicos y partes del cuerpo',
        trabajo: 'Vocabulario laboral y profesional',
        viajes: 'Términos para viajar y medios de transporte',
        vida_diaria: 'Rutinas, hogar y actividades cotidianas',
        comida: 'Alimentos, bebidas y restaurantes',
        deporte: 'Deportes, ejercicios y competiciones',
        educacion: 'Escuela, estudios y formación',
        compras: 'Tiendas, productos y precios',
        sentimientos: 'Estados de ánimo y emociones profundas',
        naturaleza: 'Paisajes, animales y fenómenos naturales',
        tecnologia: 'Dispositivos, internet y avances',
        politica: 'Gobierno, leyes y participación ciudadana',
        comunicacion: 'Medios, diálogo y expresión',
        ropa: 'Prendas, tejidos y complementos',
        clima: 'Fenómenos atmosféricos y estaciones',
        ocio: 'Hobbies, arte y entretenimiento',
        animales: 'Mascotas, fauna y especies',
        ciudad: 'Edificios, transporte y vida urbana'
    };
    return map[category] || '';
}

function sumarDias(fecha, dias) {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d.toISOString().split('T')[0];
}

// ============================================================
// FUNCIONES DE PROGRESO (SRS)
// ============================================================
async function obtenerProgresoPalabra(vocabularyId) {
    return userProgress.find(p => p.vocabulary_id === vocabularyId) || null;
}

async function actualizarProgresoPalabra(vocabularyId, acierto) {
    const progreso = await obtenerProgresoPalabra(vocabularyId);
    const hoy = new Date().toISOString().split('T')[0];
    let nuevoProgreso;

    if (!progreso) {
        nuevoProgreso = {
            user_id: USER_ID,
            vocabulary_id: vocabularyId,
            repetitions: acierto ? 1 : 0,
            interval_days: acierto ? 2 : 1,
            next_review: acierto ? sumarDias(hoy, 2) : sumarDias(hoy, 1),
            mistakes: acierto ? 0 : 1,
            mastered: false,
            favorite: false,
            last_reviewed: hoy
        };
        const { error } = await supabaseClient.from('user_vocabulary').insert([nuevoProgreso]);
        if (!error) userProgress.push(nuevoProgreso);
    } else {
        let nuevasReps = progreso.repetitions + (acierto ? 1 : 0);
        let nuevosFallos = progreso.mistakes + (acierto ? 0 : 1);
        let nuevoIntervalo = acierto ? progreso.interval_days * 2 : 1;
        let proximaFecha = sumarDias(hoy, nuevoIntervalo);

        let mastered = progreso.mastered;
        if (!mastered && (nuevasReps >= 5 || nuevoIntervalo > 30)) {
            mastered = true;
        }

        const updates = {
            repetitions: nuevasReps,
            interval_days: nuevoIntervalo,
            next_review: proximaFecha,
            mistakes: nuevosFallos,
            mastered: mastered,
            last_reviewed: hoy
        };

        const { error } = await supabaseClient
            .from('user_vocabulary')
            .update(updates)
            .eq('id', progreso.id);

        if (!error) {
            Object.assign(progreso, updates);
        }
    }

    await cargarProgresoUsuario();
    actualizarEstadisticasGlobales();
    actualizarBarraProgreso();
    actualizarFooter();
}

async function actualizarProgresoPalabraPersonal(palabraId, acierto) {
    const palabra = userPersonalWords.find(p => p.id === palabraId);
    if (!palabra) return;

    const hoy = new Date().toISOString().split('T')[0];
    let nuevasReps = palabra.repetitions + (acierto ? 1 : 0);
    let nuevosFallos = palabra.mistakes + (acierto ? 0 : 1);
    let nuevoIntervalo = acierto ? palabra.interval_days * 2 : 1;
    let proximaFecha = sumarDias(hoy, nuevoIntervalo);

    let mastered = palabra.mastered;
    if (!mastered && (nuevasReps >= 5 || nuevoIntervalo > 30)) {
        mastered = true;
    }

    const updates = {
        repetitions: nuevasReps,
        interval_days: nuevoIntervalo,
        next_review: proximaFecha,
        mistakes: nuevosFallos,
        mastered: mastered,
        last_reviewed: hoy
    };

    const { error } = await supabaseClient
        .from('user_words')
        .update(updates)
        .eq('id', palabraId);

    if (!error) {
        Object.assign(palabra, updates);
        mostrarPalabrasPersonales();
    }
}

// ============================================================
// ESTADÍSTICAS GLOBALES
// ============================================================
function actualizarEstadisticasGlobales() {
    const aprendidas = userProgress.filter(p => p.mastered).length;
    estadisticas.palabrasAprendidas = aprendidas;

    const palabrasPorTema = {};
    if (vocabularioData) {
        vocabularioData.temas.forEach(tema => {
            const idsTema = tema.palabras.map(p => p.id);
            const progresoTema = userProgress.filter(p => idsTema.includes(p.vocabulary_id));
            const aprendidasEnTema = progresoTema.filter(p => p.repetitions > 0 || p.mastered).length;
            palabrasPorTema[tema.id] = aprendidasEnTema;
        });
    }
    estadisticas.palabrasPorTema = palabrasPorTema;

    const statsLocal = JSON.parse(localStorage.getItem('estadisticasAprendizajeAleman')) || {};
    estadisticas.pruebasCompletadas = statsLocal.pruebasCompletadas || 0;
    estadisticas.puntosTotales = statsLocal.puntosTotales || 0;
}

function actualizarBarraProgreso() {
    if (!vocabularioData) return;
    const total = vocabularioData.estadisticas.totalPalabras;
    const porcentaje = (estadisticas.palabrasAprendidas / total) * 100;
    if (progressBar) progressBar.style.width = `${porcentaje}%`;
    if (wordsLearned) wordsLearned.textContent = estadisticas.palabrasAprendidas;
}

function actualizarFooter() {
    if (footerWordsLearned) footerWordsLearned.textContent = estadisticas.palabrasAprendidas;
    const stats = JSON.parse(localStorage.getItem('estadisticasAprendizajeAleman')) || { pruebasCompletadas: 0, puntosTotales: 0 };
    if (footerTestsCompleted) footerTestsCompleted.textContent = stats.pruebasCompletadas;
    if (footerTotalPoints) footerTotalPoints.textContent = stats.puntosTotales;
}

// ============================================================
// INTERFAZ: TEMAS Y VOCABULARIO PREDEFINIDO
// ============================================================
function mostrarTemas() {
    if (!themesContainer) return;
    themesContainer.innerHTML = '';
    vocabularioData.temas.forEach(tema => {
        const temaCard = document.createElement('div');
        temaCard.className = 'theme-card';
        temaCard.dataset.temaId = tema.id;

        const palabrasEnTema = tema.palabras.length;
        const palabrasAprendidasEnTema = estadisticas.palabrasPorTema[tema.id] || 0;

        temaCard.innerHTML = `
            <div class="theme-icon">${tema.icono}</div>
            <h3>${tema.nombre}</h3>
            <p class="theme-count">${palabrasAprendidasEnTema}/${palabrasEnTema} palabras</p>
            <p class="theme-desc">${tema.descripcion}</p>
        `;

        temaCard.addEventListener('click', () => {
            seleccionarTema(tema.id);
            document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
            temaCard.classList.add('active');
        });

        themesContainer.appendChild(temaCard);
    });
}

function seleccionarTema(temaId) {
    const tema = vocabularioData.temas.find(t => t.id === temaId);
    if (!tema) return;
    temaActual = tema;
    palabrasActuales = tema.palabras;
    if (currentThemeName) currentThemeName.textContent = `${tema.icono} ${tema.nombre}`;
    mostrarVocabulario();
    if (startTestBtn) {
        startTestBtn.disabled = false;
        startTestBtn.style.opacity = '1';
    }
    // Reiniciar filtro de favoritas al cambiar de tema
mostrandoSoloFavoritas = false;
const filterBtn = document.getElementById('filterFavoritesBtn');
if (filterBtn) filterBtn.innerHTML = '<i class="fas fa-star"></i> Ver favoritas';
actualizarContadorFavoritas();
mostrarVocabulario(); // o mostrarVocabularioConFiltro() si quieres mantener el filtro
}

function mostrarVocabulario() {
    if (!vocabularyList) return;
    vocabularyList.innerHTML = '';

    if (!palabrasActuales.length) {
        vocabularyList.innerHTML = `<div class="instruction"><i class="fas fa-exclamation-circle"></i><p>No hay palabras disponibles.</p></div>`;
        return;
    }

    palabrasActuales.forEach(palabra => {
        const progreso = userProgress.find(p => p.vocabulary_id === palabra.id);
        const esAprendida = progreso?.mastered || false;
        const repeticiones = progreso?.repetitions || 0;
        const esFavorita = progreso?.favorite || false;

        const card = document.createElement('div');
        card.className = 'vocabulary-card';
        card.innerHTML = `
            <div class="word-header">
                <span class="article">${palabra.article}</span>
                <div style="display: flex; gap: 8px;">
                    <button class="favorite-btn ${esFavorita ? 'favorita' : ''}" 
                            data-id="${palabra.id}" 
                            data-type="predefinida" 
                            onclick="toggleFavorite(event, this)">
                        ${esFavorita ? '★' : '☆'}
                    </button>
                    ${esAprendida ? '<span class="learned-badge"><i class="fas fa-check-circle"></i> Aprendida</span>' : ''}
                </div>
            </div>
            <div class="german-word">${palabra.word}</div>
            <div class="spanish-translation">${palabra.translation}</div>
            <div class="word-example"><strong>Ejemplo:</strong> ${palabra.example}</div>
            <div class="word-stats" style="font-size:0.8rem; color:#95a5a6; margin-top:8px;">
                Repeticiones: ${repeticiones} | Próximo repaso: ${progreso?.next_review || 'hoy'}
            </div>
        `;
        vocabularyList.appendChild(card);
    });
}

// ============================================================
// FUNCIONES DE FAVORITOS
// ============================================================
async function toggleFavorite(event, btn) {
    event.stopPropagation();
    const id = btn.dataset.id;
    const type = btn.dataset.type;
    const esFavorita = btn.textContent === '★';
    const nuevoEstado = !esFavorita;

    let table, idField;
    if (type === 'predefinida') {
        table = 'user_vocabulary';
        idField = 'vocabulary_id';
    } else {
        table = 'user_words';
        idField = 'id';
    }

    if (type === 'predefinida') {
        const { data: existing } = await supabaseClient
            .from('user_vocabulary')
            .select('id')
            .eq('user_id', USER_ID)
            .eq('vocabulary_id', id)
            .maybeSingle();

        if (!existing) {
            const hoy = new Date().toISOString().split('T')[0];
            const { error: insertError } = await supabaseClient
                .from('user_vocabulary')
                .insert([{
                    user_id: USER_ID,
                    vocabulary_id: id,
                    repetitions: 0,
                    interval_days: 1,
                    next_review: hoy,
                    mistakes: 0,
                    mastered: false,
                    favorite: nuevoEstado,
                    last_reviewed: hoy
                }]);
            if (insertError) {
                alert('Error al crear progreso: ' + insertError.message);
                return;
            }
        } else {
            const { error } = await supabaseClient
                .from(table)
                .update({ favorite: nuevoEstado })
                .eq('user_id', USER_ID)
                .eq(idField, id);
            if (error) {
                alert('Error al actualizar favorito: ' + error.message);
                return;
            }
        }
    } else {
        const { error } = await supabaseClient
            .from(table)
            .update({ favorite: nuevoEstado })
            .eq('user_id', USER_ID)
            .eq(idField, id);
        if (error) {
            alert('Error al actualizar favorito: ' + error.message);
            return;
        }
    }

    btn.textContent = nuevoEstado ? '★' : '☆';
    btn.classList.toggle('favorita', nuevoEstado);

    await cargarProgresoUsuario();
    actualizarEstadisticasGlobales();
    actualizarBarraProgreso();
    actualizarFooter();
    actualizarContadorFavoritas();
// Si estamos en modo "solo favoritas" y la palabra dejó de ser favorita, actualizar la lista
if (mostrandoSoloFavoritas && !nuevoEstado) {
    mostrarVocabularioConFiltro();
}
}

// ============================================================
// PALABRAS PERSONALES
// ============================================================
async function agregarPalabraPersonal() {
    const word = document.getElementById('newWord')?.value.trim();
    const article = document.getElementById('newArticle')?.value.trim();
    const translation = document.getElementById('newTranslation')?.value.trim();
    const example = document.getElementById('newExample')?.value.trim();
    const category = document.getElementById('newCategory')?.value.trim() || 'personal';

    if (!word || !translation) {
        alert('❌ Palabra y traducción son obligatorias');
        return;
    }

    const hoy = new Date().toISOString().split('T')[0];
    const { error } = await supabaseClient
        .from('user_words')
        .insert([{
            user_id: USER_ID,
            word,
            article,
            translation,
            example,
            category,
            repetitions: 0,
            interval_days: 1,
            next_review: hoy,
            mistakes: 0,
            mastered: false,
            favorite: false,
            last_reviewed: hoy
        }]);

    if (error) {
        console.error('Error al añadir palabra personal:', error);
        alert('Error al guardar: ' + error.message);
    } else {
        alert('✅ Palabra añadida correctamente');
        if (document.getElementById('newWord')) document.getElementById('newWord').value = '';
        if (document.getElementById('newArticle')) document.getElementById('newArticle').value = '';
        if (document.getElementById('newTranslation')) document.getElementById('newTranslation').value = '';
        if (document.getElementById('newExample')) document.getElementById('newExample').value = '';
        if (document.getElementById('newCategory')) document.getElementById('newCategory').value = '';
        await cargarPalabrasPersonales();
    }
}

function mostrarPalabrasPersonales() {
    if (!personalWordsList) return;
    personalWordsList.innerHTML = '';

    if (userPersonalWords.length === 0) {
        personalWordsList.innerHTML = '<p class="instruction">Aún no has añadido palabras personales.</p>';
        return;
    }

    userPersonalWords.forEach(palabra => {
        const esAprendida = palabra.mastered || false;
        const repeticiones = palabra.repetitions || 0;
        const esFavorita = palabra.favorite || false;

        const card = document.createElement('div');
        card.className = 'vocabulary-card';
        card.innerHTML = `
            <div class="word-header">
                <span class="article">${palabra.article || ''}</span>
                <div style="display: flex; gap: 8px;">
                    <button class="favorite-btn ${esFavorita ? 'favorita' : ''}" 
                            data-id="${palabra.id}" 
                            data-type="personal" 
                            onclick="toggleFavorite(event, this)">
                        ${esFavorita ? '★' : '☆'}
                    </button>
                    ${esAprendida ? '<span class="learned-badge"><i class="fas fa-check-circle"></i> Aprendida</span>' : ''}
                </div>
            </div>
            <div class="german-word">${palabra.word}</div>
            <div class="spanish-translation">${palabra.translation}</div>
            <div class="word-example"><strong>Ejemplo:</strong> ${palabra.example || ''}</div>
            <div class="word-stats" style="font-size:0.8rem; color:#95a5a6; margin-top:8px;">
                Repeticiones: ${repeticiones} | Próximo repaso: ${palabra.next_review || 'hoy'}
            </div>
        `;
        personalWordsList.appendChild(card);
    });
}

// ============================================================
// FUNCIONES DEL TEST
// ============================================================
function comenzarPrueba() {
    if (!temaActual || palabrasActuales.length === 0) {
        alert('Selecciona un tema primero.');
        return;
    }

    modoTest = true;
    if (learningSection) learningSection.classList.add('hidden');
    if (testSection) testSection.classList.remove('hidden');

    preguntaActual = 0;
    respuestasCorrectas = 0;
    puntuacion = 0;

    crearPreguntasTest();
    mostrarPregunta();
    actualizarEstadisticasTest();
    if (testCompletion) testCompletion.classList.add('hidden');
}

function crearPreguntasTest() {
    const mezcladas = [...palabrasActuales].sort(() => Math.random() - 0.5).slice(0, 10);
    preguntasTest = mezcladas.map((palabra, i) => ({
        id: i + 1,
        palabra: palabra,
        tipo: Math.random() > 0.5 ? 'traduccion' : 'articulo',
        respuestaUsuario: null,
        correcta: null
    }));
}

function mostrarPregunta() {
    if (preguntaActual >= preguntasTest.length) {
        finalizarPrueba();
        return;
    }

    const pregunta = preguntasTest[preguntaActual];
    const palabra = pregunta.palabra;

    if (currentQuestion) currentQuestion.textContent = preguntaActual + 1;

    if (pregunta.tipo === 'traduccion') {
        if (questionType) questionType.textContent = 'Traducción';
        if (questionText) questionText.textContent = 'Traduce la siguiente palabra al alemán:';
        if (questionWord) questionWord.textContent = palabra.translation;
        if (hintText) hintText.textContent = `Pista: El artículo es "${palabra.article}". La palabra tiene ${palabra.word.length} letras.`;
        if (answerInput) answerInput.disabled = false;
        const articleSelector = document.querySelector('.article-selector');
        if (articleSelector) articleSelector.style.display = 'none';
    } else {
        if (questionType) questionType.textContent = 'Artículo';
        if (questionText) questionText.textContent = 'Selecciona el artículo correcto para la palabra:';
        if (questionWord) questionWord.textContent = palabra.word;
        if (hintText) hintText.textContent = `Pista: Significado: "${palabra.translation}". Ejemplo: "${palabra.example}"`;
        if (answerInput) {
            answerInput.disabled = true;
            answerInput.value = '';
        }
        const articleSelector = document.querySelector('.article-selector');
        if (articleSelector) articleSelector.style.display = 'flex';
        document.querySelectorAll('.article-btn').forEach(b => b.classList.remove('active'));
    }

    if (answerInput) answerInput.value = '';
    if (feedback) feedback.classList.add('hidden');
    if (hintContent) hintContent.classList.add('hidden');
    if (toggleHintBtn) toggleHintBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Mostrar pista';
}

async function comprobarRespuesta() {
    const pregunta = preguntasTest[preguntaActual];
    const palabra = pregunta.palabra;
    let respuestaCorrecta = false;
    let respuestaUsuario = '';

    if (pregunta.tipo === 'traduccion') {
        respuestaUsuario = answerInput ? answerInput.value.trim() : '';
        respuestaCorrecta = respuestaUsuario.toLowerCase() === palabra.word.toLowerCase();
    } else {
        const active = document.querySelector('.article-btn.active');
        if (!active) { alert('Selecciona un artículo'); return; }
        respuestaUsuario = active.dataset.article;
        respuestaCorrecta = respuestaUsuario === palabra.article;
    }

    pregunta.respuestaUsuario = respuestaUsuario;
    pregunta.correcta = respuestaCorrecta;

    await actualizarProgresoPalabra(palabra.id, respuestaCorrecta);

    if (feedback) feedback.classList.remove('hidden');
    if (respuestaCorrecta) {
        if (feedback) feedback.className = 'feedback correct';
        if (feedbackTitle) feedbackTitle.innerHTML = '<i class="fas fa-check-circle"></i> ¡Correcto!';
        if (feedbackText) feedbackText.textContent = 'Has respondido correctamente.';
        respuestasCorrectas++;
        puntuacion += 10;
    } else {
        if (feedback) feedback.className = 'feedback incorrect';
        if (feedbackTitle) feedbackTitle.innerHTML = '<i class="fas fa-times-circle"></i> Incorrecto';
        if (feedbackText) feedbackText.textContent = 'La respuesta no es correcta.';
    }

    if (correctAnswerDisplay) {
        correctAnswerDisplay.innerHTML = `
            La respuesta correcta es: <span>${palabra.article} ${palabra.word}</span><br>
            Ejemplo: "${palabra.example}"
        `;
    }

    actualizarEstadisticasTest();
}

function siguientePregunta() {
    preguntaActual++;
    if (preguntaActual < preguntasTest.length) {
        mostrarPregunta();
    } else {
        finalizarPrueba();
    }
}

function finalizarPrueba() {
    if (testCompletion) testCompletion.classList.remove('hidden');
    const porcentaje = Math.round((respuestasCorrectas / preguntasTest.length) * 100);
    if (finalScore) finalScore.textContent = puntuacion;
    if (finalCorrect) finalCorrect.textContent = `${respuestasCorrectas}/${preguntasTest.length}`;
    if (finalPercentage) finalPercentage.textContent = `${porcentaje}%`;

    let mensaje = '';
    if (porcentaje === 100) mensaje = '¡Excelente! Dominas completamente este tema. 🎉';
    else if (porcentaje >= 70) mensaje = '¡Muy bien! Tienes un buen conocimiento del tema. 👍';
    else if (porcentaje >= 50) mensaje = 'Buen trabajo, pero puedes mejorar. Sigue practicando. 💪';
    else mensaje = 'Necesitas repasar más este tema. No te rindas. 📚';
    if (completionMessage) completionMessage.textContent = mensaje;

    const stats = JSON.parse(localStorage.getItem('estadisticasAprendizajeAleman')) || { pruebasCompletadas: 0, puntosTotales: 0 };
    stats.pruebasCompletadas++;
    stats.puntosTotales += puntuacion;
    localStorage.setItem('estadisticasAprendizajeAleman', JSON.stringify(stats));
    actualizarFooter();
}

function actualizarEstadisticasTest() {
    if (correctAnswers) correctAnswers.textContent = respuestasCorrectas;
    if (score) score.textContent = puntuacion;
    const porcentajeCompletado = (preguntaActual / preguntasTest.length) * 100;
    const circunferencia = 219.8;
    if (testProgress) testProgress.style.strokeDashoffset = circunferencia - (porcentajeCompletado / 100) * circunferencia;
    if (progressPercent) progressPercent.textContent = `${Math.round(porcentajeCompletado)}%`;
}

// ============================================================
// CONFIGURACIÓN DE EVENT LISTENERS
// ============================================================
function configurarEventListeners() {
    if (startTestBtn) startTestBtn.addEventListener('click', comenzarPrueba);
    if (backToLearningBtn) {
        backToLearningBtn.addEventListener('click', () => {
            modoTest = false;
            if (testSection) testSection.classList.add('hidden');
            if (learningSection) learningSection.classList.remove('hidden');
        });
    }
    if (checkAnswerBtn) checkAnswerBtn.addEventListener('click', comprobarRespuesta);
    if (answerInput) {
        answerInput.addEventListener('keypress', e => { if (e.key === 'Enter') comprobarRespuesta(); });
    }
    if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', siguientePregunta);
    articleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            articleButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    if (toggleHintBtn) {
        toggleHintBtn.addEventListener('click', function() {
            if (hintContent) hintContent.classList.toggle('hidden');
            this.innerHTML = hintContent?.classList.contains('hidden')
                ? '<i class="fas fa-lightbulb"></i> Mostrar pista'
                : '<i class="fas fa-eye-slash"></i> Ocultar pista';
        });
    }
    if (restartTestBtn) restartTestBtn.addEventListener('click', comenzarPrueba);
    if (newTestBtn) {
        newTestBtn.addEventListener('click', () => {
            const todas = vocabularioData.temas.flatMap(t => t.palabras);
            const mezcladas = todas.sort(() => Math.random() - 0.5).slice(0, 10);
            preguntasTest = mezcladas.map((p, i) => ({
                id: i + 1,
                palabra: p,
                tipo: Math.random() > 0.5 ? 'traduccion' : 'articulo'
            }));
            preguntaActual = 0;
            respuestasCorrectas = 0;
            puntuacion = 0;
            modoTest = true;
            if (learningSection) learningSection.classList.add('hidden');
            if (testSection) testSection.classList.remove('hidden');
            mostrarPregunta();
            actualizarEstadisticasTest();
            if (testCompletion) testCompletion.classList.add('hidden');
        });
    }
    const filterBtn = document.getElementById('filterFavoritesBtn');
if (filterBtn) {
    filterBtn.addEventListener('click', toggleFiltrarFavoritas);
}
}

// ============================================================
// FUNCIÓN DE ERROR
// ============================================================
function mostrarError(mensaje) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>${mensaje}</span>`;
    errorDiv.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #e74c3c; color: white;
        padding: 15px 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000; display: flex; align-items: center; gap: 10px; max-width: 300px;
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// ============================================================
// FUNCIONES PARA FILTRAR FAVORITAS
// ============================================================
function toggleFiltrarFavoritas() {
    mostrandoSoloFavoritas = !mostrandoSoloFavoritas;
    const btn = document.getElementById('filterFavoritesBtn');
    if (btn) {
        btn.innerHTML = mostrandoSoloFavoritas 
            ? '<i class="fas fa-list"></i> Ver todas' 
            : '<i class="fas fa-star"></i> Ver favoritas';
    }
    mostrarVocabularioConFiltro();
}

function mostrarVocabularioConFiltro() {
    if (!vocabularyList) return;
    vocabularyList.innerHTML = '';

    if (!palabrasActuales.length) {
        vocabularyList.innerHTML = `<div class="instruction"><i class="fas fa-exclamation-circle"></i><p>No hay palabras disponibles.</p></div>`;
        return;
    }

    // Filtrar palabras según el estado
    let palabrasAMostrar = palabrasActuales;
    if (mostrandoSoloFavoritas) {
        palabrasAMostrar = palabrasActuales.filter(p => {
            const progreso = userProgress.find(up => up.vocabulary_id === p.id);
            return progreso?.favorite === true;
        });
    }

    if (palabrasAMostrar.length === 0) {
        vocabularyList.innerHTML = `<div class="instruction"><i class="fas fa-star"></i><p>No tienes palabras favoritas en este tema.</p></div>`;
        return;
    }

    palabrasAMostrar.forEach(palabra => {
        const progreso = userProgress.find(p => p.vocabulary_id === palabra.id);
        const esAprendida = progreso?.mastered || false;
        const repeticiones = progreso?.repetitions || 0;
        const esFavorita = progreso?.favorite || false;

        const card = document.createElement('div');
        card.className = 'vocabulary-card';
        card.innerHTML = `
            <div class="word-header">
                <span class="article">${palabra.article}</span>
                <div style="display: flex; gap: 8px;">
                    <button class="favorite-btn ${esFavorita ? 'favorita' : ''}" 
                            data-id="${palabra.id}" 
                            data-type="predefinida" 
                            onclick="toggleFavorite(event, this)">
                        ${esFavorita ? '★' : '☆'}
                    </button>
                    ${esAprendida ? '<span class="learned-badge"><i class="fas fa-check-circle"></i> Aprendida</span>' : ''}
                </div>
            </div>
            <div class="german-word">${palabra.word}</div>
            <div class="spanish-translation">${palabra.translation}</div>
            <div class="word-example"><strong>Ejemplo:</strong> ${palabra.example}</div>
            <div class="word-stats" style="font-size:0.8rem; color:#95a5a6; margin-top:8px;">
                Repeticiones: ${repeticiones} | Próximo repaso: ${progreso?.next_review || 'hoy'}
            </div>
        `;
        vocabularyList.appendChild(card);
    });

    actualizarContadorFavoritas();
}

function actualizarContadorFavoritas() {
    const favCount = document.getElementById('favoriteCount');
    if (!favCount) return;
    
    const favoritasEnTema = palabrasActuales.filter(p => {
        const progreso = userProgress.find(up => up.vocabulary_id === p.id);
        return progreso?.favorite === true;
    }).length;
    
    favCount.innerHTML = `⭐ ${favoritasEnTema} favoritas`;
}