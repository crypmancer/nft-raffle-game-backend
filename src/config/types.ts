export interface INft {
  nftAddress: string;
  nftId: string;
  nftAmount: string;
  nftName?: string;
  nftUri?: string;
}

export interface IParticipant {
  owner: string;
  etherValue: string;
  nftTokens: INft[];
}

export interface ITemp {
  tempId: string;
  state: number;
  deposit: IParticipant;
}

export interface ITempContract {
  id: string;
  state: number;
  deposit: IParticipant;
}

export interface IRisk {
  id: string;
  author: string;
  registeredTime: string;
  endedTime: string;
  state: number;
  participants: IParticipant[];
  playerId: string;
  winner: string;
  randomResult: {
    randomNumber: string;
    nomalizedRandomNumber: string;
  };
  txHash: string;
}
