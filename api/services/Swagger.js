/**
 * Swagger
 *
 * @description :: The gateway to ESI.
 * @help        :: https://esi.tech.ccp.is/ui/
 */

// TODO: This service is getting far too big and will need to be segmented out.

// Originally we used eve-swagger but had some weird issues
// coming up in stats (possibly due to old endpoints.)
const ESI_AUTH_URL = 'https://login.eveonline.com/oauth/token';

let ESI = require('eve-swagger-simple'),
    request = require('request'),
    qs = require('qs'),
    client_id = process.env.ESI_CLIENT_ID,
    client_secret = process.env.ESI_CLIENT_SECRET;

module.exports = {

  async refresh(token) {
    return new Promise((resolve, reject) => {
      request({
        url: ESI_AUTH_URL,
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + new Buffer(client_id + ':' + client_secret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Host': 'login.eveonline.com'
        },
        body: qs.stringify({
          'grant_type': 'refresh_token',
          'refresh_token': token
        }),
        json: true
      }, (error, response, body) => {
        if (error) {
          sails.log.error(error);
          return reject(error);
        }

        return resolve(body);
      });
    });
  },

  async route(origin, destination) {
    let route = await ESI.request(`/route/${origin}/${destination}`);

    return route;
  },

  async corporation(id, allianceRecord) {
    if (!id)
      return;

    let localCorporation = await Corporation.findOne(id);

    if (!localCorporation) {
      let {
        name,
        ticker,
        member_count: memberCount
      } = await ESI.request(`/corporations/${id}`);

      localCorporation = await Corporation.create({
        id,
        name,
        ticker,
        memberCount,
        alliance: allianceRecord ? allianceRecord.id : null
      })
      .intercept('E_UNIQUE', (e) => { return new Error(`Tried to create a corp that already exists. ${e}`) })
      .fetch();
    }

    return localCorporation;
  },

  async alliance(id) {
    if (!id)
      return;

    let localAlliance = await Alliance.findOne(id);

    if (!localAlliance || !localAlliance.name) {
      let { name, ticker } = await ESI.request(`/alliances/${id}`);

      if (!localAlliance) {
        localAlliance = await Alliance.create({ id, name, ticker })
        .intercept('E_UNIQUE', (e) => { return new Error(`Tried to create an alliance that already exists. ${e}`) })
        .fetch();
      } else {
        localAlliance = await Alliance.update(id, { name, ticker }).fetch();
        localAlliance = _.first(localAlliance);
      }
    }

    return localAlliance;
  },

  /**

     Forced Calls
     ============

     Usually because we want latest data

  **/

  characterPublic(characterId) {
    return ESI.request(`/characters/${characterId}`);
  },

  async characterPrivate(character_id, token, refresh_token) {
    let _successfullyUpdateTokens = async() => {
      let newTokens;

      try {
        newTokens = await this.refresh(refresh_token);
      } catch (e) {
        sails.log.error(`ESI rejected our request for new tokens, force user to re-auth.`);
        return false;
      }

      let { access_token: accessToken, refresh_token: refreshToken } = newTokens;

      if (!accessToken || !refreshToken) {
        sails.log.error(`ESI didn't error out, but didn't pass us new tokens.`);
        return false;
      }

      await Character.update(character_id, { accessToken, refreshToken });

      token = accessToken;
      refresh_token = refreshToken;

      return true;
    };

    // TODO: Holy shit this whole flow sucks. There has to be a better way.
    let location, ship, online;

    try {
      location = await this.characterLocation(character_id, token);
    } catch(e) {
      let refreshed = await _successfullyUpdateTokens();

      if (!refreshed) {
        return new Error(`Couldn't update location, please re-auth.`);
      }

      location = await this.characterLocation(character_id, token);
    }

    try {
      ship = await this.characterShip(character_id, token);
    } catch(e) {
      let refreshed = await _successfullyUpdateTokens();

      if (!refreshed) {
        return new Error(`Couldn't update ship, please re-auth.`);
      }

      ship = await this.characterShip(character_id, token);
    }

    try {
      online = await this.characterOnline(character_id, token);
    } catch(e) {
      let refreshed = await _successfullyUpdateTokens();

      if (!refreshed) {
        return new Error(`Couldn't update online status, please re-auth.`);
      }

      online = await this.characterOnline(character_id, token);
    }

    return { location, ship, online };
  },

  characterLocation(character_id, token) {
    return ESI.request(`/characters/${character_id}/location`, { character_id, token });
  },

  characterShip(character_id, token) {
    return ESI.request(`/characters/${character_id}/ship`, { character_id, token });
  },

  characterOnline(character_id, token) {
    return ESI.request(`/characters/${character_id}/online`, { character_id, token });
  }

};
