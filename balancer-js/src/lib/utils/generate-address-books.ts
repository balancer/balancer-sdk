import axios from 'axios';
import { Network } from '@/types';
import _ from 'lodash';
import * as fs from 'fs';

type AddressDictByNetwork = {
  [key: string]: {
    contracts: AddressDict;
    tokens: AddressDict;
  };
};

type AddressDict = {
  [key: string]: string;
};

const addressBookUrl =
  'https://raw.githubusercontent.com/BalancerMaxis/bal_addresses/main/outputs/addressbook.json';

const developAddressBookOutputUrl =
  'https://raw.githubusercontent.com/balancer/balancer-sdk/develop/balancer-js/src/lib/constants/address.json';
const generateAddressesFile = async () => {
  //Fetching the addresses
  const addressBook = (await axios.get(addressBookUrl)).data;
  //creating output empty object
  let output: AddressDictByNetwork = {};
  //Getting the current addressBook from develop branch
  let data;
  try {
    const response = await axios.get(developAddressBookOutputUrl);
    data = response.data;
  } catch (e) {
    console.log(
      'Error fetching develop address book, will not provide log of changes'
    );
  }
  const developAddressBook = data;

  //Filtering the addressBook to get active addresses by network
  Object.entries(Network)
    .filter(([key]) => {
      //removing number keys like '1', '42', '137', etc
      return Number.isNaN(parseInt(key));
    })
    .map(([key, value]) => {
      const networkActiveAddressBook =
        addressBook['active'][key.toLowerCase()] ?? undefined;
      if (!networkActiveAddressBook) {
        return;
      }
      //Getting tokens from addressBook
      const tokens =
        typeof networkActiveAddressBook.tokens === 'object'
          ? Object.entries(
              networkActiveAddressBook.tokens as { [key: string]: string }
            )
              .sort(sortEntriesAlphabetically)
              //For the tokens it's not being applied the camelCase for the token names
              .reduce(reduceWithLowerCaseAddress, {})
          : {};

      const deploymentKeys = Object.keys(networkActiveAddressBook).filter(
        (key) => {
          //Getting keys from deployments by verifying if the first 8 digits are numbers
          return key.match(/^[0-9]{8}/g);
        }
      );
      let contracts: { [key: string]: string } = {};
      deploymentKeys.map((dKey) => {
        contracts = {
          ...contracts,
          ...(networkActiveAddressBook[dKey] as { [key: string]: string }),
        };
      });
      output = {
        ...output,
        [value]: {
          contracts: Object.entries(contracts)
            .sort(sortEntriesAlphabetically)
            .reduce(reduceWithCamelCaseKeyAndLowerCaseAddress, {}),
          tokens,
        },
      };
      if (developAddressBook) {
        compareOutputWithDevelop(output[value], developAddressBook[value], key);
      }
    });
  //Writing the output to the file
  fs.writeFile(
    'src/lib/constants/addresses.json',
    JSON.stringify(output),
    (err) => console.error(err)
  );
  return 'Success! Address file generated on src/lib/constants/addresses.json';
};

const reduceWithCamelCaseKeyAndLowerCaseAddress = (
  acc: Record<string, never> | Record<string, string>,
  [key, value]: [string, string]
) => {
  return {
    ...acc,
    [_.camelCase(key)]: value.toLocaleLowerCase(),
  };
};

const reduceWithLowerCaseAddress = (
  acc: Record<string, never> | Record<string, string>,
  [key, value]: [string, string]
) => {
  return {
    ...acc,
    [key]: value.toLocaleLowerCase(),
  };
};
const sortEntriesAlphabetically = (
  [a]: [string, unknown],
  [b]: [string, unknown]
) => {
  return a.localeCompare(b);
};

const compareOutputWithDevelop = (
  output: {
    contracts: AddressDict;
    tokens: AddressDict;
  },
  develop: {
    contracts: AddressDict;
    tokens: AddressDict;
  },
  network: string
) => {
  console.log('Comparing Contracts of network: ', network);
  if (!develop?.contracts) {
    console.log('New network: ' + network);
    return;
  }
  const outputContractsKeys = Object.keys(output.contracts);
  const developContractsKeys = Object.keys(develop.contracts);
  outputContractsKeys.map((key) => {
    if (developContractsKeys.includes(key)) {
      if (
        output.contracts[key].toLowerCase() !==
        develop.contracts[key].toLowerCase()
      ) {
        console.log(
          `Contract ${key} has different addresses in develop and active`
        );
        console.log('Develop: ', develop.contracts[key]);
        console.log('Active: ', output.contracts[key]);
      }
    } else {
      console.log(`Contract ${key} is new, not present in develop`);
      console.log('Address: ', output.contracts[key]);
    }
  });
  //Do the same for output.tokens
  const outputTokensKeys = Object.keys(output.tokens);
  const developTokensKeys = Object.keys(develop.tokens);
  outputTokensKeys.map((key) => {
    if (developTokensKeys.includes(key)) {
      if (
        output.tokens[key].toLowerCase() !== develop.tokens[key].toLowerCase()
      ) {
        console.log(
          `Token ${key} has different addresses in develop and active`
        );
        console.log('Develop: ', develop.tokens[key]);
        console.log('Active: ', output.tokens[key]);
      }
    } else {
      console.log(`Token ${key} is new, not present in develop`);
      console.log('Address: ', output.tokens[key]);
    }
  });
};

generateAddressesFile().then((r) => console.log(r));
