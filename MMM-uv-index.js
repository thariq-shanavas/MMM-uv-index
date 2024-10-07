/* global Log Module */

/* MagicMirror²
 * Module: MMM-uv-index
 *
 * MIT Licensed.
 */
Module.register("MMM-uv-index", {

    defaults: {
        lat: null,
        lon: null,
        appid: "",
        colors: true,

        updateInterval: 60 * 60 * 1000, // every 1 hour
        animationSpeed: 1000,

        initialLoadDelay: 0, // 0 seconds delay
        retryDelay: 2500,

        apiVersion: "3.0",
        apiBase: "https://api.openweathermap.org/data/",
        uvEndpoint: "onecall",
    },

    getStyles () {
        return ["uv-index.css"];
    },

    getTranslations () {
        return {
            de: "translations/de.json",
            en: "translations/en.json",
            nl: "translations/nl.json",
            pl: "translations/pl.json"
        };
    },

    start () {
        Log.info(`Starting module: ${this.name}`);

        this.value = null;
        this.date = null;
        this.loaded = false;
        this.scheduleUpdate(this.config.initialLoadDelay);
    },

    getDom () {
        const wrapper = document.createElement("div");

        if (this.config.appid === "") {
            wrapper.innerHTML = `Please set the correct <i>appid</i> in the config for module: ${this.name}.`;
            wrapper.className = "dimmed light small";
        } else if (this.config.lat === null || this.config.lon === null) {
            wrapper.innerHTML =`Please set the correct <i>lat</i> and <i>lon</i> in the config for module: ${this.name}.`;
            wrapper.className = "dimmed light small";
        } else if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING");
            wrapper.className = "dimmed light small";
        } else {
            const table = document.createElement("table");
            table.className = "small";

            const row = document.createElement("tr");
            table.appendChild(row);

            const valueColumn = document.createElement("td");
            valueColumn.className = "small value";
            valueColumn.innerHTML = this.value;
            row.appendChild(valueColumn);

            const scaleColumn = document.createElement("td");
            scaleColumn.className = `small scale align-right ${this.colorValue(this.value)}`;
            scaleColumn.innerHTML = this.scaleValue(this.value);
            row.appendChild(scaleColumn);

            wrapper.appendChild(table);
        }
        return wrapper;
    },

    scaleValue (value) {
        if (value <= 2.0) {
            return this.translate("low");
        } else if (value <= 5.0) {
            return this.translate("moderate");
        } else if (value <= 7.0) {
            return this.translate("high");
        } else if (value <= 10.0) {
            return this.translate("veryHigh");
        } else {
            return this.translate("extreme");
        }
    },

    colorValue (value) {
        if (this.config.colors) {
            if (value <= 2.0) {
                return "green";
            } else if (value <= 5.0) {
                return "yellow";
            } else if (value <= 7.0) {
                return "orange";
            } else if (value <= 10.0) {
                return "red";
            } else {
                return "violet";
            }
        }
        return "";
    },

    async updateUV () {
        let retry = false;
        if (this.config.appid === "") {
            Log.error(`${this.name}: APPID not set!`);
        } else if (this.config.lat === null || this.config.lon === null) {
            Log.error(`${this.name}: lat and/or lon not set!`);
        } else {
            const url = `${this.config.apiBase}${this.config.apiVersion}/${this.config.uvEndpoint}${this.getParams()}`;
            const self = this;

            try {
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    self.processUV(data);
                } else if (response.status === 401) {
                    self.updateDom(self.config.animationSpeed);
                    Log.error(`${self.name}: Incorrect APPID.`);
                } else {
                    Log.error(`${self.name}: Could not load uv.`);
                    retry = true;
                }
            } catch (error) {
                Log.error(`${self.name}: Could not load uv. ${error}`);
                retry = true;
            }
        }

        if (retry && !this.loaded) {
            self.scheduleUpdate(self.config.retryDelay);
        }
    },

    getParams () {
        let params = `?lat=${this.config.lat}`;
        params += `&lon=${this.config.lon}`;
        params += `&APPID=${this.config.appid}`;
        return params;
    },

    processUV (data) {
        if (!data || typeof data.current.uvi === "undefined") {
            // Did not receive usable new data.
            // Maybe this needs a better check?
            return;
        }

        this.value = data.current.uvi;
        this.loaded = true;
        this.updateDom(this.config.animationSpeed);
        this.sendNotification("CURRENTUV_DATA", {data});
    },

    scheduleUpdate (delay) {
        let nextLoad = this.config.updateInterval;
        if (typeof delay !== "undefined" && delay >= 0) {
            nextLoad = delay;
        }

        const self = this;
        setTimeout(() => {
            self.updateUV();
        }, nextLoad);
    },

});
