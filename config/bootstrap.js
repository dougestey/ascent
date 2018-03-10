/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.bootstrap.html
 */

require('dotenv-safe').config();

module.exports.bootstrap = async(cb) => {

  // TODO: Move these to the scheduler so Kue can manage them.
  // This will also improve Arbiter's start time by an order of magnitude.

  if (process.env.BOOTSTRAP_DB === 'true')
    await Swagger.initialize();

  Sentinel.initialize();

  Swagger.updateKills();
  Swagger.updateJumps();

  sails.config.jobs.init();

  // cb() must be called in order for sails to lift, do not remove.
  cb();
};
