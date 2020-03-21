const DigestRequest = require('request-digest');

class DDF {
    constructor(username, password, isTesting) {
        this.username = username;
        this.password = password;
        this.isTesting = isTesting;
        this.cookie = null;

        this.host = 'https://data.crea.ca';
        if (this.isTesting === true) {
            this.host = 'http://sample.data.crea.ca';
        }
    }

    /**
     * Login
     *
     * @returns {Promise<null>}
     */
    async login() {
        if (this.cookie === null) {

            let loginRequest = DigestRequest(this.username, this.password);
            let loginResponse = await loginRequest.requestAsync({
                host: this.host,
                path: '/Login.svc/Login',
                method: 'POST',
                excludePort: true,
                headers: {},
            });
            this.cookie = loginResponse.response.headers['set-cookie'][1].split(';')[0];
        }

        return this.cookie;
    }

    /**
     *
     * @param lastUpdated
     * @param page
     * @returns {Promise<*>}
     */
    async searchByLastUpdated(lastUpdated, page) {
        try {
            let offset = (page - 1) * 100 + 1;
            let searchRequest = DigestRequest(this.username, this.password);
            let searchResponse = await searchRequest.requestAsync({
                host: this.host,
                path: `/Search.svc/Search?SearchType=Property&Class=Property&QueryType=DMQL2&Query=(LastUpdated=${lastUpdated})&Offset=${offset}`,
                method: 'GET',
                excludePort: true,
                headers: {
                    "Cookie": this.cookie
                }
            });

            return searchResponse.body;
        } catch (e) {
            console.log(e);
        }
    }

    /**
     *
     * @param ID
     * @returns {Promise<*>}
     */
    async searchById(ID) {
        try {
            let searchRequest = DigestRequest(this.username, this.password);
            let searchResponse = await searchRequest.requestAsync({
                host: this.host,
                path: `/Search.svc/Search?SearchType=Property&Class=Property&QueryType=DMQL2&Query=(ID=${ID})`,
                method: 'GET',
                excludePort: true,
                headers: {
                    "Cookie": this.cookie
                }
            });

            return searchResponse.body;
        } catch (e) {
            console.log(e);
        }
    }

    /**
     *
     * @returns {Promise<*>}
     */
    async masterPull() {
        return await this.searchById("*");
    }

    /**
     *
     * @param property
     * @param myJSON
     * @returns {*}
     */
    static propertyToJSON(property, myJSON) {
        const listOfPlurals  = {
            'Phones': 'Phone',
            'Websites': 'Website',
            'Rooms': 'Room',
            'ParkingSpaces': 'Parking',
            'Photo': 'PropertyPhoto',
        };

        for (let item in property) {
            if (item === "$") {
                for (let attr in property[item]) {
                    myJSON[attr] = property[item][attr].trim();
                }
            } else if (typeof property[item][0] === "object") {
                if (typeof listOfPlurals[item] !== "undefined") {
                    myJSON[item] = [];
                    for (let subItem of property[item][0][listOfPlurals[item]]) {
                        let subItemTitle = listOfPlurals[item];
                        let subItemJSON = {};
                        for (let itemInSubItem in subItem) {
                            if (itemInSubItem === "_") {
                                subItemJSON[subItemTitle] = subItem[itemInSubItem].trim();
                            } else if (itemInSubItem === '$') {
                                for (let subItemAttr in subItem[itemInSubItem]) {
                                    subItemJSON[subItemAttr] = subItem[itemInSubItem][subItemAttr].trim();
                                }
                            } else {
                                subItemJSON[itemInSubItem] = subItem[itemInSubItem][0].trim();
                            }
                        }

                        myJSON[item].push(subItemJSON);
                    }
                } else {
                    myJSON[item] = this.propertyToJSON(property[item][0], {})
                }
            } else {
                myJSON[item] = property[item][0].trim();
            }
        }

        return myJSON;
    }
}

module.exports = DDF;