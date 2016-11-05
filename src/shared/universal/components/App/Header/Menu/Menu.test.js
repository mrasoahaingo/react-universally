/* eslint-disable no-undef */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { shallow } from 'enzyme';
import { shallowToJson } from 'enzyme-to-json';
import Menu from './Menu';

describe('<Home />', () => {
  test('Renders an unordered list', () => {
    const wrapper = shallow(<Menu />);
    expect(wrapper.find('ul').length).toBe(1);
  });
  test('renders a snapshot', () => {
    const wrapper = shallow(<Menu />);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
