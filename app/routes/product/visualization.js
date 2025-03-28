import Ember from 'ember';
import ENV from '../../config/environment';

const {apiURL} = ENV;
const {RSVP, computed, $, set, get, copy} = Ember;

export default Ember.Route.extend({
  i18n: Ember.inject.service(),
  featureToggle: Ember.inject.service(),

  firstYear: computed.alias('featureToggle.first_year'),
  lastYear: computed.alias('featureToggle.last_year'),

  queryParams: {
    rca: { refreshModel: false },
    startDate: { refreshModel: false },
    endDate: { refreshModel: false },
    search: { refreshModel: false }
  },
  controllerName: 'visualization',
  renderTemplate() {
    this.render('visualization');
  },
  model(params) {
    let {product_id, visualization_type, source_type, variable} = params;
    set(this, 'product_id', product_id);
    set(this, 'source_type', source_type);
    set(this, 'visualization_type', visualization_type);
    set(this, 'variable', variable);

    return RSVP.hash(this.get(source_type)).then((hash) => {
      if(source_type === 'departments') {
        return this.departmentsDataMunging(hash);
      } else if (source_type === 'cities') {
        return this.citiesDataMunging(hash);
      } else if (source_type === 'partners') {
        return this.partnersDataMunging(hash);
      }
    });
  },
  afterModel(graphbuilderModel) {
    return graphbuilderModel.setProperties({
      visualization: get(this, 'visualization_type'),
      source: get(this, 'source_type'),
      metaData: this.modelFor('application'),
      variable: get(this, 'variable'),
      entity_type:'product',
    });
  },
  departments: computed('product_id', function() {
    let id = get(this, 'product_id');
    return {
      model: this.store.find('product', id),
      locations: $.getJSON(`${apiURL}/data/product/${id}/exporters?level=department`),
      cities: $.getJSON(`${apiURL}/data/product/${id}/exporters?level=msa`)
    };
  }),
  partners: computed('product_id', function() {
    let id = get(this, 'product_id');
    return {
      model: this.store.find('product', id),
      partners: $.getJSON(`${apiURL}/data/product/${id}/partners?level=country`)
    };
  }),
  cities: computed('product_id', function() {
    let id = get(this, 'product_id');
    return {
      model: this.store.find('product', id),
      cities: $.getJSON(`${apiURL}/data/product/${id}/exporters?level=msa`)
    };
  }),
  departmentsDataMunging(hash) {
    let {model,locations, cities} = hash;
    let locationsMetadata  = this.modelFor('application').locations;

    let data = _.map(locations.data, (d) => {
      let location = locationsMetadata[d.department_id];
      let department = copy(d);
      return _.merge(department, location, {model: 'location'});
    });

    let datas = _.map(cities.data, (d) => {
      let location = locationsMetadata[d.msa_id];
      let city = copy(d);
      let result = _.merge(
        city, location,
        {
          model: 'location',
          parent_name_en: locationsMetadata[location.parent_id].name_short_en,
          parent_name_es: locationsMetadata[location.parent_id].name_short_es,
        }
      );
      return result;
    });

    return Ember.Object.create({
      entity: model,
      data: data,
      cities: datas
    });
  },
  citiesDataMunging(hash) {
    let {model,cities} = hash;
    let locationsMetadata  = this.modelFor('application').locations;

    let data = _.map(cities.data, (d) => {
      let location = locationsMetadata[d.msa_id];
      let city = copy(d);
      let result = _.merge(
        city, location,
        {
          model: 'location',
          parent_name_en: locationsMetadata[location.parent_id].name_short_en,
          parent_name_es: locationsMetadata[location.parent_id].name_short_es,
        }
      );
      return result;
    });

    return Ember.Object.create({
      entity: model,
      data: data,
    });
  },
  partnersDataMunging(hash) {
    let {model,partners} = hash;
    let partnersMetadata = this.modelFor('application').partnerCountries;

    let data = _.map(partners.data, (d) => {
      let country = partnersMetadata[d.country_id];
      let parent = partnersMetadata[country.parent_id];
      let partner = copy(d);
      partner.parent_name_en = parent.name_en;
      partner.parent_name_es = parent.name_es;
      partner.group = parent.id;
      d.model = null;
      return _.merge(partner, parent, country);
    });

    return Ember.Object.create({
      entity: model,
      data: data,
    });
  },
  setupController(controller, model) {
    this._super(controller, model);
    controller.set('drawerChangeGraphIsOpen', false); // Turn off other drawers
    controller.set('drawerQuestionsIsOpen', false); // Turn off other drawers
    controller.set('searchText', controller.get('search'));
    window.scrollTo(0, 0);
  },
  resetController(controller, isExiting) {
    controller.set('variable', null);

    if (isExiting) {
      controller.setProperties({
        variable: null,
        startDate: this.get('firstYear'),
        endDate: this.get('lastYear')
      });
    }
  }
});

