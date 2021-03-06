/**
 * Character.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    id: { type: 'number', autoIncrement: false, required: true },

    name: 'string',

    online: 'boolean',

    lastLogin: 'string',

    lastLogout: 'string',

    lastLocationUpdate: 'string',

    accessToken: 'string',

    refreshToken: 'string',

    // Relationships

    system: { model: 'system' },

    ship: { model: 'type' },

    corporation: { model: 'corporation' },

    alliance: { model: 'alliance' }

  },

  customToJSON: function() {
    return _.omit(this, [
      'accessToken',
      'refreshToken'
    ]);
  }
};
