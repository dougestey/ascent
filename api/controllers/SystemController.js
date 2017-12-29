/**
 * SystemController
 *
 * @description :: Server-side logic for managing Systems
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  async findOne(req, res) {
    if (!req.params.system)
      return res.badRequest();

    let system;

    if (isNaN(req.params.system))
      system = await System.findOne({ name: req.params.system })
        .populate('planets')
        .populate('moons')
        .populate('constellation')
        .populate('star')
        .populate('stargates');
    else
      system = await Swagger.system(req.params.system);

    if (!system)
      return res.notFound();

    return res.status(200).json(system);
  }

};
