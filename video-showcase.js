(() => {
    const videoBrands = [
        "Cartier", "Rolex", "Rolex", "Cartier", "Cartier", "Rolex", "Rolex", "Rolex",
        "Rolex", "Rolex", "Rolex", "Rolex", "Rolex", "Rolex", "Cartier", "Rolex",
        "Rolex", "Rolex", "Rolex", "Rolex", "Rolex", "Cartier", "Rolex", "Rolex",
        "Cartier", "Rolex", "Cartier", "Rolex", "Rolex", "Rolex", "Rolex", "Rolex"
    ];
    const videos = videoBrands.map((brand, index) => {
        const id = String(index + 1).padStart(2, "0");
        return {
            id,
            brand,
            src: "relojes/videos/reloj-" + id + ".mp4",
            poster: "relojes/videos/reloj-" + id + ".jpg"
        };
    });
    const featuredIds = new Set(["01", "02", "07", "22"]);

    function createCard(item) {
        const card = document.createElement("article");
        card.className = "motion-video-card";
        card.dataset.videoId = item.id;
        card.hidden = !featuredIds.has(item.id);

        const frame = document.createElement("div");
        frame.className = "motion-video-frame";

        const poster = document.createElement("img");
        poster.className = "motion-video-poster";
        poster.src = item.poster;
        poster.alt = "Vista previa de un reloj " + item.brand;
        poster.loading = "lazy";
        poster.decoding = "async";

        const playButton = document.createElement("button");
        playButton.type = "button";
        playButton.className = "motion-play-button";
        playButton.setAttribute("aria-label", "Reproducir video sin audio de " + item.brand);
        playButton.innerHTML = '<span class="motion-play-icon" aria-hidden="true"></span>';

        const silentBadge = document.createElement("span");
        silentBadge.className = "motion-video-badge";
        silentBadge.textContent = "Sin audio";

        frame.append(poster, playButton, silentBadge);

        const details = document.createElement("div");
        details.className = "motion-video-details";

        const brand = document.createElement("span");
        brand.className = "motion-video-brand";
        brand.textContent = item.brand;

        const title = document.createElement("h4");
        title.textContent = "Vista en movimiento";

        const number = document.createElement("span");
        number.className = "motion-video-number";
        number.textContent = "Detalle " + item.id;

        details.append(brand, title, number);
        card.append(frame, details);

        playButton.addEventListener("click", () => {
            const player = document.createElement("video");
            player.className = "motion-video-player";
            player.src = item.src;
            player.poster = item.poster;
            player.controls = true;
            player.preload = "none";
            player.muted = true;
            player.defaultMuted = true;
            player.playsInline = true;
            player.setAttribute("muted", "");
            player.setAttribute("playsinline", "");
            player.setAttribute("aria-label", "Video sin audio: " + item.brand);

            const badge = frame.querySelector(".motion-video-badge");
            frame.replaceChildren(player, badge);
            player.addEventListener("play", () => {
                document.querySelectorAll(".motion-video-player").forEach(otherPlayer => {
                    if (otherPlayer !== player) otherPlayer.pause();
                });
            });
            const playback = player.play();
            if (playback && typeof playback.catch === "function") playback.catch(() => {});
        });

        return card;
    }

    function initializeShowcase() {
        const grid = document.getElementById("motion-video-grid");
        const moreButton = document.getElementById("motion-more-button");
        if (!grid || !moreButton) return;

        const orderedVideos = [
            ...videos.filter(video => featuredIds.has(video.id)),
            ...videos.filter(video => !featuredIds.has(video.id))
        ];
        orderedVideos.forEach(video => grid.appendChild(createCard(video)));

        const count = document.getElementById("motion-video-count");
        if (count) count.textContent = String(videos.length);
        moreButton.textContent = "Ver los " + videos.length + " videos";

        let expanded = false;
        moreButton.addEventListener("click", () => {
            expanded = !expanded;
            grid.querySelectorAll(".motion-video-card").forEach(card => {
                card.hidden = !expanded && !featuredIds.has(card.dataset.videoId);
            });
            moreButton.setAttribute("aria-expanded", String(expanded));
            moreButton.textContent = expanded ? "Mostrar selección destacada" : "Ver los " + videos.length + " videos";
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeShowcase, { once: true });
    } else {
        initializeShowcase();
    }
})();