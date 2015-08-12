import Ember from 'ember';

export default Ember.Route.extend({
  queryParams: {
    query: { refreshModel: true }
  },
  beforeModel: function(transition) {
    var hasQuery = transition
      .queryParams
      .hasOwnProperty('query');

    // if search is empty, redirect to route without param
    if(hasQuery && !transition.queryParams.query){
      this.transitionTo('search');
    }
  },
  model: function(transition) {
    var country = this.store.find('location', {level: 'country'});
    var departments = this.store.find('location', {level: 'department'});
    var municipalities = this.store.find('location', {level: 'municipality'});
    var msa = this.store.find('location', {level: 'msa'});
    var products = this.store.find('product', { level: '4digit' });
    var industries = this.store.find('industry', { level: 'division' });

    if(transition.query) {
      return Ember.RSVP.all([industries, country, departments, msa, municipalities, products])
        .then(function(array) {
          return _.chain(array)
            .map(function(d){ return d.content; })
            .flatten()
            .value();
        }, function() {
          return [];
        });
    }
  },
  setupController(controller, model) {
    this._super(controller, model);
    this.controllerFor('application').set('entity', 'location');
    this.controllerFor('application').set('entity_id', 1044);
    window.scrollTo(0, 0);
  },
});
