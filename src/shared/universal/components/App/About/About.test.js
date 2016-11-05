/* eslint-disable no-undef */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { shallow } from 'enzyme';
import { shallowToJson } from 'enzyme-to-json';
import About from './About';

describe('<About />', () => {
  test('Renders the component', () => {
    const wrapper = shallow(<About />);
    expect(wrapper.find('div').length).toBe(1);
  });
  test('renders a snapshot', () => {
    const wrapper = shallow(<About />);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
