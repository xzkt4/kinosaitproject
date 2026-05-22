const API_KEY = 'df666e8c-9d56-4fc7-b07b-03d741e02684';
const BASE_URL = 'https://kinopoiskapiunofficial.tech/api/v2.2';

let currentPage = 1;

function getMaxPages(type) {
    if (type === 'TOP_250_BEST_FILMS') return 10;
    if (type === 'TOP_100_POPULAR_FILMS') return 4;
    return 10;
}

async function loadMovies(page = 1) {
    currentPage = page;
    const type = document.getElementById('typeSelect').value;
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('moviesGrid').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';

    try {
        const response = await fetch(`${BASE_URL}/films/top?type=${type}&page=${page}`, {
            headers: { 'X-API-KEY': API_KEY }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.films && data.films.length > 0) {
            showMovies(data.films);
            const maxPages = getMaxPages(type);
            showPagination(Math.min(data.pagesCount || maxPages, maxPages));
        } else {
            document.getElementById('error').textContent = 'Ничего не найдено';
            document.getElementById('error').style.display = 'block';
        }
    } catch (err) {
        document.getElementById('error').textContent = `Ошибка загрузки: ${err.message}`;
        document.getElementById('error').style.display = 'block';
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function showMovies(films) {
    const grid = document.getElementById('moviesGrid');
    grid.innerHTML = '';

    films.forEach(film => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <img src="${film.posterUrlPreview}" class="movie-poster"
                 onerror="this.src='https://placehold.co/180x260?text=Нет+постера'">
            <div class="movie-info">
                <div class="movie-title">${film.nameRu || film.nameOriginal || 'Без названия'}</div>
                <div class="movie-year">${film.year || '—'} ★ ${film.ratingKinopoisk || '-'}</div>
            </div>
        `;
        card.onclick = () => showMovieDetails(film.filmId);
        grid.appendChild(card);
    });
}

async function showMovieDetails(id) {
    document.querySelector('.modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">×</span>
            <div style="text-align:center; padding: 60px; color:#aaa; font-size:16px;">Загрузка...</div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();

    modal.querySelector('.close-modal').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    const onKeyDown = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onKeyDown);

    try {
        const [filmRes, staffRes] = await Promise.all([
            fetch(`${BASE_URL}/films/${id}`, { headers: { 'X-API-KEY': API_KEY } }),
            fetch(`https://kinopoiskapiunofficial.tech/api/v1/staff?filmId=${id}`, { headers: { 'X-API-KEY': API_KEY } })
        ]);

        const movie = await filmRes.json();
        const staff = staffRes.ok ? await staffRes.json() : [];

        const directors = staff
            .filter(p => p.professionKey === 'DIRECTOR')
            .map(p => `<span onclick="showActorDetails(${p.staffId}); event.stopImmediatePropagation()" style="cursor:pointer;text-decoration:underline">${p.nameRu || p.nameEn}</span>`)
            .slice(0, 3)
            .join(', ') || '—';

        const actorsHtml = staff
            .filter(p => p.professionKey === 'ACTOR')
            .slice(0, 12)
            .map(p => `
                <div onclick="showActorDetails(${p.staffId}); event.stopImmediatePropagation()" 
                     style="cursor:pointer; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                    <img src="${p.posterUrl}" style="width:40px;height:55px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'">
                    <span style="text-decoration:underline">${p.nameRu || p.nameEn}</span>
                    ${p.description ? `<span style="color:#888;font-size:14px;">(${p.description})</span>` : ''}
                </div>
            `).join('') || '—';

        const genres = movie.genres?.map(g => g.genre).join(', ') || '—';
        const countries = movie.countries?.map(c => c.country).join(', ') || '—';
        const votes = movie.ratingKinopoiskVoteCount ? movie.ratingKinopoiskVoteCount.toLocaleString('ru') + ' голосов' : '';

        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">×</span>
                <div class="modal-body">
                    <img src="${movie.posterUrl || movie.posterUrlPreview || ''}" class="modal-poster" alt="Постер"
                         onerror="this.style.display='none'">
                    <div class="modal-info">
                        <h1>${movie.nameRu || movie.nameOriginal || 'Без названия'}</h1>
                        ${movie.nameOriginal && movie.nameRu ? `<p style="color:#888; margin-bottom:8px">${movie.nameOriginal}</p>` : ''}
                        <p class="modal-year">
                            ${movie.year || '—'} 
                            ${movie.filmLength ? ' • ' + movie.filmLength + ' мин' : ''} 
                            ${countries ? ' • ' + countries : ''}
                        </p>
                        <p class="modal-rating">
                            ⭐ ${movie.ratingKinopoisk || '—'}
                            ${votes ? `<span style="font-size:13px; font-weight:normal; color:#aaa"> ${votes}</span>` : ''}
                        </p>
                        <p><strong>Жанр:</strong> ${genres}</p>
                        <h3>Описание</h3>
                        <p class="modal-overview">${movie.description || 'Описание отсутствует.'}</p>
                        <p><strong>Режиссёр:</strong> ${directors}</p>
                        <h3>В главных ролях</h3>
                        <div style="max-height:420px; overflow-y:auto; padding-right:10px;">${actorsHtml}</div>
                    </div>
                </div>
            </div>
        `;

    } catch (err) {
        console.error(err);
        alert('Не удалось загрузить информацию о фильме');
        closeModal();
    }
}

async function showActorDetails(personId) {
    document.querySelectorAll('.modal').forEach(m => m.remove());

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">×</span>
            <div style="text-align:center; padding: 100px; color:#aaa;">Загрузка информации об актёре...</div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();

    modal.querySelector('.close-modal').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    try {
        const res = await fetch(`https://kinopoiskapiunofficial.tech/api/v1/staff/${personId}`, {
            headers: { 'X-API-KEY': API_KEY }
        });

        if (!res.ok) throw new Error('Не удалось загрузить данные');

        const person = await res.json();

        const films = person.films || [];
        const actorFilms = films.filter(f => 
            f.professionKey === 'ACTOR' || 
            (f.professionKey === 'VOICE' && f.nameRu)
        ).slice(0, 30);

        const filmsHtml = actorFilms.map(film => `
            <div class="actor-film-card" onclick="showMovieDetails(${film.filmId}); event.stopImmediatePropagation()">
                <img src="${film.posterUrlPreview || film.posterUrl}" class="actor-film-poster"
                     onerror="this.src='https://placehold.co/160x220?text=Нет+постера'">
                <div class="actor-info">
                    <div class="movie-title" style="font-size:14px;">${film.nameRu || film.nameEn || 'Без названия'}</div>
                    <div style="color:#aaa;font-size:13px;">${film.year || '—'} • ${film.ratingKinopoisk ? '★ ' + film.ratingKinopoisk : ''}</div>
                </div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="modal-content" style="max-width:1100px;">
                <span class="close-modal">×</span>
                
                <div style="display:flex; gap:40px; flex-wrap:wrap; align-items:flex-start;">
                    <div>
                        <img src="${person.posterUrl || ''}" style="width:320px; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.7);" 
                             onerror="this.src='https://placehold.co/320x420?text=Нет+фото'" alt="${person.nameRu}">
                    </div>
                    
                    <div style="flex:1; min-width:300px;">
                        <h1 style="margin:0 0 10px 0;">${person.nameRu || person.nameEn}</h1>
                        ${person.nameEn && person.nameRu ? `<p style="color:#aaa;font-size:20px;margin-bottom:20px;">${person.nameEn}</p>` : ''}
                        <div class="films-count">${actorFilms.length} фильмов</div>
                        ${person.birthday ? `<p><strong>Дата рождения:</strong> ${person.birthday} ${person.birthplace ? `(${person.birthplace})` : ''}</p>` : ''}
                        ${person.deathday ? `<p><strong>Дата смерти:</strong> ${person.deathday}</p>` : ''}
                    </div>
                </div>

                <h3 style="margin:40px 0 20px 0; color:#ffcc00;">Фильмография</h3>
                <div class="actor-films-grid">
                    ${filmsHtml || '<p>Фильмография не найдена</p>'}
                </div>
            </div>
        `;

    } catch (err) {
        console.error(err);
        alert('Не удалось загрузить информацию об актёре');
        closeModal();
    }
}

function showPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.textContent = '← Назад';
    prev.disabled = currentPage === 1;
    prev.onclick = () => {
        if (currentPage > 1) loadMovies(currentPage - 1);
    };
    pagination.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => loadMovies(i);
        pagination.appendChild(btn);
    }

    const next = document.createElement('button');
    next.className = 'page-btn';
    next.textContent = 'Вперёд →';
    next.disabled = currentPage >= totalPages;
    next.onclick = () => {
        if (currentPage < totalPages) loadMovies(currentPage + 1);
    };
    pagination.appendChild(next);
}

window.onload = () => loadMovies(1);