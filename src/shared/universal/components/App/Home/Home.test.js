/* eslint-disable no-undef */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { shallow } from 'enzyme';
import { shallowToJson } from 'enzyme-to-json';
import Home from './Home';

describe('<Home />', () => {
  test('The component renders and does not break.', () => {
    const wrapper = shallow(<Home />);
    expect(wrapper.find('article').length).toBe(1);
  });
  test('renders a snapshot', () => {
    const wrapper = shallow(<Home />);
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
