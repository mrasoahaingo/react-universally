/* eslint-disable no-undef */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { shallow } from 'enzyme';
import { shallowToJson } from 'enzyme-to-json';
import Error404 from './Error404';

describe('<Error404 />', () => {
  test('Renders the component', () => {
    const wrapper = shallow(<Error404 />);
    expect(wrapper.find('div').length).toBe(1);
  });
  test('renders a snapshot', () => {
    const wrapper = shallow(<Error404 />);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
