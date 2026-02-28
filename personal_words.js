async function agregarPalabraPersonal() {
    const word = document.getElementById('newWord').value.trim();
    const article = document.getElementById('newArticle').value.trim();
    const translation = document.getElementById('newTranslation').value.trim();
    const example = document.getElementById('newExample').value.trim();
    const category = document.getElementById('newCategory')?.value || 'personal';

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
            favorite: false
        }]);

    if (error) {
        console.error('Error al añadir palabra personal:', error);
        alert('Error al guardar: ' + error.message);
    } else {
        alert('✅ Palabra añadida correctamente');
        // Limpiar formulario
        document.getElementById('newWord').value = '';
        document.getElementById('newArticle').value = '';
        document.getElementById('newTranslation').value = '';
        document.getElementById('newExample').value = '';
        // Recargar lista si existe la función
        if (typeof cargarPalabrasPersonales === 'function') {
            cargarPalabrasPersonales();
        }
    }
}